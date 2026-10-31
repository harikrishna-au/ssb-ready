import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:ssb_ready_app/core/services/lifetime_premium_service.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';

class LifetimePremiumScreen extends StatefulWidget {
  const LifetimePremiumScreen({super.key});

  @override
  State<LifetimePremiumScreen> createState() => _LifetimePremiumScreenState();
}

class _LifetimePremiumScreenState extends State<LifetimePremiumScreen> {
  final LifetimePremiumService _service = LifetimePremiumService();
  final Razorpay _razorpay = Razorpay();
  bool _loading = false;
  bool _verifying = false;
  String? _orderId;
  String? _statusMessage;
  bool _statusIsError = false;

  @override
  void initState() {
    super.initState();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;
    final isPremium = user?.isPremium == true;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildAppBar(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeroCard(isPremium),
                  const SizedBox(height: 20),
                  const _SectionLabel(label: 'PRICING'),
                  const SizedBox(height: 12),
                  _buildPricingCard(),
                  const SizedBox(height: 20),
                  if (isPremium)
                    _buildAlreadyPremiumCard()
                  else ...[
                    _buildCTAButton(user),
                    const SizedBox(height: 8),
                    const Center(
                      child: Text(
                        'One-time payment · No subscription · No renewals',
                        style: TextStyle(fontSize: 12, color: AppColors.textHint),
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  const _SectionLabel(label: 'WHAT YOU UNLOCK'),
                  const SizedBox(height: 14),
                  _buildBenefitsList(),
                  const SizedBox(height: 24),
                  if (_statusMessage != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: _statusIsError
                            ? AppColors.error.withValues(alpha: 0.10)
                            : AppColors.success.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _statusIsError
                              ? AppColors.error.withValues(alpha: 0.25)
                              : AppColors.success.withValues(alpha: 0.25),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _statusIsError
                                ? Icons.error_outline_rounded
                                : Icons.check_circle_outline_rounded,
                            color: _statusIsError
                                ? AppColors.error
                                : AppColors.success,
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _statusMessage!,
                              style: TextStyle(
                                color: _statusIsError
                                    ? AppColors.error
                                    : AppColors.success,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 32),
                  _buildTrustRow(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppColors.background,
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded,
            size: 18, color: AppColors.textPrimary),
        onPressed: () => Navigator.pop(context),
      ),
      title: const Text(
        'Lifetime Premium',
        style: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _buildHeroCard(bool isPremium) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1C1000), Color(0xFF261800)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
            color: AppColors.premiumColor.withValues(alpha: 0.35), width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.premiumColor.withValues(alpha: 0.10),
            blurRadius: 32,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.premiumColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppColors.premiumColor.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.workspace_premium_outlined,
                    color: AppColors.premiumColor, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Lifetime Access',
                      style: TextStyle(
                        color: AppColors.premiumColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'Unlock everything,\nonce and for life.',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.4,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'One payment. No renewal. No subscription. Full access to every premium feature in SSB Ready — now and forever.',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          // Price chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _PriceChip(
                  label: '₹499 value',
                  strikethrough: true,
                  color: AppColors.textHint),
              _PriceChip(
                  label: '₹200 off',
                  color: AppColors.success),
              _PriceChip(
                  label: '₹299 today',
                  color: AppColors.premiumColor,
                  bold: true),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBenefitsList() {
    final benefits = [
      (
        icon: Icons.image_search_outlined,
        title: 'Complete PPDT Image Bank',
        desc:
            'Access the full curated set instead of the preview deck. Practice with the exact variety you\'ll see in the actual test.',
        color: AppColors.ppdtColor,
      ),
      (
        icon: Icons.style_outlined,
        title: 'All TAT Cards Unlocked',
        desc:
            'Train with the complete TAT set — not just sample cards — so your timing and story quality match real exam conditions.',
        color: AppColors.primary,
      ),
      (
        icon: Icons.auto_awesome_outlined,
        title: 'Priority Practice Flow',
        desc:
            'Distraction-free premium experience with faster image loading and a focused preparation environment.',
        color: AppColors.secondary,
      ),
      (
        icon: Icons.all_inclusive_rounded,
        title: 'Lifetime Updates',
        desc:
            'Every future feature, new image, and AI improvement included. You pay once, you get everything forever.',
        color: AppColors.success,
      ),
    ];

    return Column(
      children: benefits
          .map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _BenefitCard(
                    icon: b.icon,
                    title: b.title,
                    desc: b.desc,
                    color: b.color),
              ))
          .toList(),
    );
  }

  Widget _buildPricingCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: AppColors.premiumColor.withValues(alpha: 0.25), width: 1),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('List price',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 14)),
              const Text('₹499',
                  style: TextStyle(
                      color: AppColors.textHint,
                      fontSize: 14,
                      decoration: TextDecoration.lineThrough,
                      decorationColor: AppColors.textHint)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Launch discount',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 14)),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('−₹200',
                    style: TextStyle(
                        color: AppColors.success,
                        fontSize: 13,
                        fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: AppColors.border),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'You pay today',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700),
              ),
              Text(
                '₹299',
                style: TextStyle(
                  color: AppColors.premiumColor,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCTAButton(dynamic user) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed:
            _loading || _verifying ? null : () => _startPurchase(user),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.premiumColor,
          foregroundColor: Colors.black,
          disabledBackgroundColor:
              AppColors.premiumColor.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18)),
          elevation: 0,
        ),
        child: _loading || _verifying
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5, color: Colors.black))
            : const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.workspace_premium_outlined, size: 20),
                  SizedBox(width: 10),
                  Text(
                    'Buy Lifetime Access — ₹299',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildAlreadyPremiumCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
            color: AppColors.success.withValues(alpha: 0.25), width: 1),
      ),
      child: const Row(
        children: [
          Icon(Icons.check_circle_rounded, color: AppColors.success, size: 24),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You\'re Premium',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'All premium features are unlocked. Enjoy your lifetime access.',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrustRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _TrustItem(icon: Icons.lock_outline_rounded, label: 'Secure Payment'),
        const SizedBox(width: 20),
        _TrustItem(icon: Icons.all_inclusive_rounded, label: 'No Renewals'),
        const SizedBox(width: 20),
        _TrustItem(
            icon: Icons.support_agent_outlined, label: 'Email Support'),
      ],
    );
  }

  // ── Payment handlers ──────────────────────────────────────────────────────
  Future<void> _startPurchase(dynamic user) async {
    if (user == null) return;
    setState(() {
      _loading = true;
      _statusMessage = null;
      _statusIsError = false;
    });

    try {
      final username = user.fullName.trim().isNotEmpty
          ? user.fullName
          : (user.firstName ?? user.email.split('@').first);
      final response = await _service.createOrder(
        email: user.email,
        username: username,
      );
      final orderId = (response['order_id'] ?? '').toString();
      final keyId = (response['key_id'] ?? '').toString();
      final amount = response['amount_paise'];
      if (orderId.isEmpty || keyId.isEmpty || amount is! int) {
        throw Exception('Payment order could not be created.');
      }

      setState(() {
        _orderId = orderId;
        _statusMessage = 'Opening Razorpay checkout…';
        _statusIsError = false;
      });

      _razorpay.open({
        'key': keyId,
        'amount': amount,
        'currency': response['currency'] ?? 'INR',
        'name': 'SSB Ready',
        'description': 'Lifetime Premium Access',
        'order_id': orderId,
        'prefill': {'email': user.email, 'name': username},
        'notes': {
          'plan': 'lifetime',
          'amount_inr': response['amount_inr'] ?? 299,
        },
        'theme': {'color': '#FFD166'},
      });
    } catch (e) {
      setState(() {
        _statusMessage = e.toString().replaceFirst('Exception: ', '');
        _statusIsError = true;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    final orderId = response.orderId ?? _orderId;
    final paymentId = response.paymentId;
    final signature = response.signature;
    if (orderId == null || paymentId == null || signature == null) {
      setState(() {
        _statusMessage =
            'Payment completed but verification details were incomplete. Contact support.';
        _statusIsError = true;
      });
      return;
    }

    setState(() {
      _verifying = true;
      _statusMessage = 'Verifying payment…';
      _statusIsError = false;
    });

    try {
      final res = await _service.verifyPayment(
        orderId: orderId,
        paymentId: paymentId,
        signature: signature,
      );
      if (res['success'] == true) {
        if (!mounted) return;
        context.read<AuthBloc>().add(const CheckAuthStatusEvent());
        setState(() {
          _statusMessage = 'Lifetime Premium activated successfully!';
          _statusIsError = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lifetime Premium activated.')),
        );
      } else {
        throw Exception('Payment verification failed.');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _statusMessage = e.toString().replaceFirst('Exception: ', '');
        _statusIsError = true;
      });
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (!mounted) return;
    setState(() {
      _statusMessage = response.message?.isNotEmpty == true
          ? response.message
          : 'Payment was cancelled or failed. Please try again.';
      _statusIsError = true;
      _loading = false;
      _verifying = false;
    });
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (!mounted) return;
    setState(() {
      _statusMessage =
          'External wallet: ${response.walletName ?? 'wallet'} selected.';
      _statusIsError = false;
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Local widgets
// ─────────────────────────────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});
  @override
  Widget build(BuildContext context) => Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.4,
          color: AppColors.textHint,
        ),
      );
}

class _BenefitCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;
  final Color color;
  const _BenefitCard(
      {required this.icon,
      required this.title,
      required this.desc,
      required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.18), width: 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text(desc,
                    style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        height: 1.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PriceChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool strikethrough;
  final bool bold;
  const _PriceChip(
      {required this.label,
      required this.color,
      this.strikethrough = false,
      this.bold = false});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: bold
            ? Border.all(color: color.withValues(alpha: 0.4))
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 13,
          fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          decoration:
              strikethrough ? TextDecoration.lineThrough : null,
          decorationColor: color,
        ),
      ),
    );
  }
}

class _TrustItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustItem({required this.icon, required this.label});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 20, color: AppColors.textHint),
        const SizedBox(height: 4),
        Text(label,
            style:
                const TextStyle(fontSize: 10, color: AppColors.textHint)),
      ],
    );
  }
}
