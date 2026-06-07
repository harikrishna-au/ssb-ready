import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/history_service.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['All', 'WAT', 'SRT', 'TAT', 'PPDT', 'OIR', 'SDT'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final userId =
        authState is AuthAuthenticated ? authState.user.id : '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Test History'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: AppColors.primary,
          indicatorSize: TabBarIndicatorSize.label,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textHint,
          labelStyle: const TextStyle(
              fontSize: 13, fontWeight: FontWeight.w700),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _tabs.map((tab) {
          return _HistoryTab(
            userId: userId,
            testType: tab == 'All' ? null : tab,
          );
        }).toList(),
      ),
    );
  }
}

class _HistoryTab extends StatefulWidget {
  final String userId;
  final String? testType;

  const _HistoryTab({required this.userId, this.testType});

  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab>
    with AutomaticKeepAliveClientMixin {
  List<TestHistoryEntry>? _entries;
  bool _loading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final entries = widget.testType == null
        ? await HistoryService.getHistory(widget.userId, limit: 50)
        : await HistoryService.getHistoryByType(
            widget.userId, widget.testType!);
    if (mounted) setState(() { _entries = entries; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_loading) {
      return Center(
        child: CircularProgressIndicator(
          valueColor:
              const AlwaysStoppedAnimation(AppColors.primary),
        ),
      );
    }

    final entries = _entries ?? [];

    if (entries.isEmpty) {
      return _buildEmpty();
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
        itemCount: entries.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _HistoryCard(entry: entries[i]),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                  color: AppColors.surfaceSoft, shape: BoxShape.circle),
              child: const Icon(Icons.history_rounded,
                  color: AppColors.textHint, size: 32),
            ),
            const SizedBox(height: 20),
            const Text('No tests yet',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              widget.testType == null
                  ? 'Complete your first test to see results here.'
                  : 'You haven\'t completed a ${widget.testType} test yet.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final TestHistoryEntry entry;
  const _HistoryCard({required this.entry});

  Color get _color => _colorFor(entry.testType);
  IconData get _icon => _iconFor(entry.testType);

  static Color _colorFor(String type) {
    switch (type) {
      case 'WAT': return AppColors.accent;
      case 'SRT': return AppColors.secondary;
      case 'TAT': return AppColors.primary;
      case 'PPDT': return AppColors.ppdtColor;
      case 'OIR': return AppColors.oirColor;
      case 'SDT': return const Color(0xFF10B981);
      default: return AppColors.primary;
    }
  }

  static IconData _iconFor(String type) {
    switch (type) {
      case 'WAT': return Icons.text_fields_rounded;
      case 'SRT': return Icons.flash_on_rounded;
      case 'TAT': return Icons.image_search_rounded;
      case 'PPDT': return Icons.draw_rounded;
      case 'OIR': return Icons.calculate_rounded;
      case 'SDT': return Icons.person_outline_rounded;
      default: return Icons.quiz_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasScore = entry.score > 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _color.withValues(alpha: 0.2)),
      ),
      child: Row(children: [
        // Icon
        Container(
          width: 46, height: 46,
          decoration: BoxDecoration(
            color: _color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(_icon, color: _color, size: 22),
        ),
        const SizedBox(width: 14),
        // Info
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: _color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(entry.testType,
                    style: TextStyle(
                        color: _color, fontSize: 10,
                        fontWeight: FontWeight.w800, letterSpacing: 0.5)),
              ),
              const SizedBox(width: 8),
              Text(entry.timeAgo,
                  style: const TextStyle(
                      color: AppColors.textHint, fontSize: 11)),
            ]),
            const SizedBox(height: 6),
            Text(
              '${entry.answeredCount} of ${entry.totalCount} completed',
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        )),
        // Score
        if (hasScore) Column(children: [
          Text(entry.scoreLabel,
              style: TextStyle(
                  color: _color, fontSize: 20,
                  fontWeight: FontWeight.w900)),
          const Text('score',
              style: TextStyle(
                  color: AppColors.textHint, fontSize: 10)),
        ]) else Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.surfaceSoft,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(entry.completionLabel,
              style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}
