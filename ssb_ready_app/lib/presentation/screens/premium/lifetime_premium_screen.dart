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
      appBar: AppBar(
        title: const Text('Lifetime Premium'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F766E), Color(0xFF115E59)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(26),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Unlock everything for life',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'One payment. No renewal. Full access to premium practice content, curated images, and deeper preparation flow.',
                    style: TextStyle(color: Colors.white70, height: 1.45),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      _buildPriceChip('₹499 value'),
                      const SizedBox(width: 10),
                      _buildPriceChip('₹200 off'),
                      const SizedBox(width: 10),
                      _buildPriceChip('₹299 lifetime'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            _buildBenefitCard(
              title: 'Complete PPDT image bank',
              description:
                  'Use the full curated set instead of the preview deck and practice with the exact flow you will see in the app.',
              icon: Icons.image_search_outlined,
            ),
            const SizedBox(height: 12),
            _buildBenefitCard(
              title: 'All TAT cards unlocked',
              description:
                  'Train with the complete TAT set, not just the sample cards, so your practice matches real timing and variety.',
              icon: Icons.style_outlined,
            ),
            const SizedBox(height: 12),
            _buildBenefitCard(
              title: 'Priority prep flow',
              description:
                  'Save time with faster access, smoother practice, and a distraction-free premium experience.',
              icon: Icons.speed,
            ),
            const SizedBox(height: 22),
            if (isPremium)
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Text(
                  'You already have lifetime premium access.',
                  style: TextStyle(fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              )
            else ...[
              ElevatedButton(
                onPressed:
                    _loading || _verifying ? null : () => _startPurchase(user),
                child: _loading || _verifying
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('BUY LIFETIME ACCESS FOR ₹299'),
              ),
              const SizedBox(height: 10),
              const Text(
                'Price includes a ₹200 launch discount on the ₹499 lifetime plan.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
            if (_statusMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                _statusMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPriceChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style:
            const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildBenefitCard({
    required String title,
    required String description,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: AppColors.secondary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: const TextStyle(
                      height: 1.4, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _startPurchase(dynamic user) async {
    if (user == null) return;
    setState(() {
      _loading = true;
      _statusMessage = null;
    });

    try {
      final username = (user.fullName as String?)?.trim().isNotEmpty == true
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
        _statusMessage = 'Opening secure Razorpay checkout...';
      });

      _razorpay.open({
        'key': keyId,
        'amount': amount,
        'currency': response['currency'] ?? 'INR',
        'name': 'SSB Ready',
        'description': 'Lifetime Premium Access',
        'order_id': orderId,
        'prefill': {
          'email': user.email,
          'name': username,
        },
        'notes': {
          'plan': 'lifetime',
          'list_price_inr': response['list_price_inr'] ?? 499,
          'discount_inr': response['discount_inr'] ?? 200,
          'amount_inr': response['amount_inr'] ?? 299,
        },
        'theme': {'color': '#0F766E'},
      });
    } catch (e) {
      setState(() {
        _statusMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    final orderId = response.orderId ?? _orderId;
    final paymentId = response.paymentId;
    final signature = response.signature;
    if (orderId == null || paymentId == null || signature == null) {
      setState(() {
        _statusMessage =
            'Payment completed, but verification details were incomplete. Contact support with your Razorpay payment ID.';
      });
      return;
    }

    setState(() {
      _verifying = true;
      _statusMessage = 'Verifying payment...';
    });

    try {
      final verification = await _service.verifyPayment(
        orderId: orderId,
        paymentId: paymentId,
        signature: signature,
      );
      if (verification['success'] == true) {
        if (!mounted) return;
        context.read<AuthBloc>().add(const CheckAuthStatusEvent());
        setState(() {
          _statusMessage = 'Premium activated successfully.';
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
      });
    } finally {
      if (mounted) {
        setState(() => _verifying = false);
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (!mounted) return;
    setState(() {
      _statusMessage = response.message?.isNotEmpty == true
          ? response.message
          : 'Payment was cancelled or failed. Please try again.';
      _loading = false;
      _verifying = false;
    });
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (!mounted) return;
    setState(() {
      _statusMessage =
          'External wallet selected: ${response.walletName ?? 'wallet'}.';
    });
  }
}
