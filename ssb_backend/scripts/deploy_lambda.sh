#!/usr/bin/env bash
# Rebuilds the backend package and updates the live Lambda function.
#
#   scripts/deploy_lambda.sh          update the code only
#   scripts/deploy_lambda.sh --env    also push settings from ssb_backend/.env (merged over what is already set)
#
# Needs the AWS CLI logged in. Defaults to the `aws-project` profile in Sydney, the only region this account allows.
# The package never contains .env files; the script refuses to upload if one sneaks in.
set -euo pipefail
PROFILE="${AWS_PROFILE_NAME:-aws-project}"; REGION="${AWS_REGION_NAME:-ap-southeast-2}"; FN="${LAMBDA_NAME:-readykadet-api}"
cd "$(dirname "$0")/.."

BUILD="$(mktemp -d)"; ZIP="$BUILD.zip"; trap 'rm -rf "$BUILD" "$ZIP"' EXIT
rsync -a --exclude=node_modules --exclude='.env*' --exclude=tests --exclude=test --exclude=scripts --exclude=eval \
  --exclude=docs --exclude=Dockerfile --exclude='*.md' --exclude=.git --exclude=tmp ./ "$BUILD/"
( cd "$BUILD" && npm ci --omit=dev --no-audit --no-fund >/dev/null && zip -qr "$ZIP" . -x '*.map' )

if unzip -l "$ZIP" | grep -Ei '(^|/)\.env|\.pem$|service.?account' >/dev/null; then echo "Refusing to upload: a secret-looking file is in the package." >&2; exit 1; fi
echo "package: $(du -h "$ZIP" | cut -f1)"

aws lambda update-function-code --profile "$PROFILE" --region "$REGION" --function-name "$FN" --zip-file "fileb://$ZIP" --query 'LastUpdateStatus' --output text
aws lambda wait function-updated-v2 --profile "$PROFILE" --region "$REGION" --function-name "$FN"

if [ "${1:-}" = "--env" ]; then
  ENVJSON="$(mktemp)"; chmod 600 "$ENVJSON"; trap 'rm -rf "$BUILD" "$ZIP" "$ENVJSON"' EXIT
  CURRENT="$(aws lambda get-function-configuration --profile "$PROFILE" --region "$REGION" --function-name "$FN" --query 'Environment.Variables' --output json)"
  CURRENT="$CURRENT" python3 - "$ENVJSON" <<'PY'
import json, os, sys
env = json.loads(os.environ["CURRENT"] or "{}")
skip = {"PORT", "HOST", "PUBLIC_URL", "NODE_ENV", "CORS_ORIGIN"}  # set once on the function, not copied from .env
for line in open(".env"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line: continue
    k, v = line.split("=", 1); k, v = k.strip(), v.strip().strip("\"'")
    if v and k not in skip and not k.startswith("FIREBASE"): env[k] = v
json.dump({"Variables": env}, open(sys.argv[1], "w"))
PY
  aws lambda update-function-configuration --profile "$PROFILE" --region "$REGION" --function-name "$FN" --environment "file://$ENVJSON" --query 'LastUpdateStatus' --output text
  aws lambda wait function-updated-v2 --profile "$PROFILE" --region "$REGION" --function-name "$FN"
fi
echo "deployed: $(aws lambda get-function-url-config --profile "$PROFILE" --region "$REGION" --function-name "$FN" --query FunctionUrl --output text)"
