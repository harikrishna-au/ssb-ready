import 'dart:typed_data';

import 'package:image/image.dart' as img;

/// Resizes and re-encodes a photo for OCR upload: smaller payload, faster API, lower cost.
/// Falls back to [raw] if decoding fails (e.g. some HEIC paths on older decoders).
class OcrImagePayload {
  OcrImagePayload({required this.bytes, required this.mimeType});

  final Uint8List bytes;
  final String mimeType;
}

const int _kMaxOcrWidth = 1600;
const int _kJpegQuality = 82;

Future<OcrImagePayload> prepareImageForOcr(Uint8List raw, {String pathHint = ''}) async {
  final decoded = img.decodeImage(raw);
  if (decoded == null) {
    return OcrImagePayload(
      bytes: raw,
      mimeType: _mimeFromPath(pathHint),
    );
  }

  var image = decoded;
  if (image.width > _kMaxOcrWidth) {
    image = img.copyResize(
      image,
      width: _kMaxOcrWidth,
      interpolation: img.Interpolation.average,
    );
  }

  final encoded = img.encodeJpg(image, quality: _kJpegQuality);
  return OcrImagePayload(
    bytes: Uint8List.fromList(encoded),
    mimeType: 'image/jpeg',
  );
}

String _mimeFromPath(String path) {
  final lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}
