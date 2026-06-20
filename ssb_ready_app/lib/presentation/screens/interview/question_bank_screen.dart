import 'package:flutter/material.dart';
import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────
class _Question {
  final String section;
  final String question;
  bool saved = false;

  _Question({
    required this.section,
    required this.question,
  });

  factory _Question.fromJson(Map<String, dynamic> json) => _Question(
        section: json['section']?.toString() ?? 'General',
        question: json['question']?.toString() ?? '',
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
class QuestionBankScreen extends StatefulWidget {
  const QuestionBankScreen({super.key});

  @override
  State<QuestionBankScreen> createState() => _QuestionBankScreenState();
}

class _QuestionBankScreenState extends State<QuestionBankScreen>
    with SingleTickerProviderStateMixin {
  final _api = BackendApiClient();
  late Future<List<_Question>> _questionsFuture;
  String _selectedSection = 'All';
  String _searchQuery = '';
  final _searchController = TextEditingController();
  late TabController _tabController;

  static const _sectionOrder = [
    'All',
    'CIQ 1',
    'CIQ 2',
    'CIQ 3',
    'CIQ 4',
    'CIQ 6',
    'Self Assessment',
  ];

  static const _sectionMeta = {
    'CIQ 1': (label: 'Academics & Peers', icon: Icons.school_outlined),
    'CIQ 2': (label: 'Family & Finances', icon: Icons.home_outlined),
    'CIQ 3': (label: 'Hobbies & Routine', icon: Icons.fitness_center_outlined),
    'CIQ 4': (label: 'Sports & Defence', icon: Icons.military_tech_outlined),
    'CIQ 6': (label: 'Service Knowledge', icon: Icons.shield_outlined),
    'Self Assessment': (
      label: 'Self Assessment',
      icon: Icons.person_outline_rounded
    ),
  };

  @override
  void initState() {
    super.initState();
    _tabController =
        TabController(length: _sectionOrder.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _selectedSection = _sectionOrder[_tabController.index]);
      }
    });
    _questionsFuture = _fetchQuestions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<List<_Question>> _fetchQuestions() async {
    final response = await _api.get('/api/interview/bank?limit=200');
    final raw = response['questionBank'] as List<dynamic>? ?? [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(_Question.fromJson)
        .where((q) => q.question.isNotEmpty)
        .toList();
  }

  List<_Question> _filter(List<_Question> all) {
    return all.where((q) {
      final sectionMatch =
          _selectedSection == 'All' || q.section == _selectedSection;
      final searchMatch = _searchQuery.isEmpty ||
          q.question.toLowerCase().contains(_searchQuery.toLowerCase());
      return sectionMatch && searchMatch;
    }).toList();
  }

  Map<String, List<_Question>> _groupBySection(List<_Question> questions) {
    final map = <String, List<_Question>>{};
    for (final q in questions) {
      map.putIfAbsent(q.section, () => []).add(q);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: FutureBuilder<List<_Question>>(
        future: _questionsFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return _buildLoadingState();
          }
          if (snap.hasError || !snap.hasData || snap.data!.isEmpty) {
            return _buildErrorState(snap.error?.toString());
          }
          final all = snap.data!;
          return _buildContent(all);
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return CustomScrollView(
      slivers: [
        _buildAppBar(),
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    color: AppColors.interviewColor,
                    backgroundColor:
                        AppColors.interviewColor.withValues(alpha: 0.15),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Loading question bank…',
                    style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(String? error) {
    return CustomScrollView(
      slivers: [
        _buildAppBar(),
        SliverFillRemaining(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.10),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.wifi_off_rounded,
                      color: AppColors.error, size: 36),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Could not load questions',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  error ?? 'Check your internet connection and try again.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () =>
                      setState(() => _questionsFuture = _fetchQuestions()),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent(List<_Question> all) {
    final filtered = _filter(all);
    final grouped = _selectedSection == 'All'
        ? _groupBySection(filtered)
        : {_selectedSection: filtered};

    return NestedScrollView(
      headerSliverBuilder: (context, _) => [
        _buildAppBar(),
        _buildSearchBar(),
        _buildTabBar(all),
      ],
      body: filtered.isEmpty
          ? _buildEmptySearch()
          : _buildQuestionList(grouped, all),
    );
  }

  SliverAppBar _buildAppBar() {
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
        'Common Questions Bank',
        style: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  SliverToBoxAdapter _buildSearchBar() {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        child: TextField(
          controller: _searchController,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 15),
          onChanged: (v) => setState(() => _searchQuery = v),
          decoration: InputDecoration(
            hintText: 'Search questions…',
            hintStyle:
                const TextStyle(color: AppColors.textHint, fontSize: 15),
            prefixIcon: const Icon(Icons.search_rounded,
                color: AppColors.textHint, size: 20),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close_rounded,
                        color: AppColors.textHint, size: 18),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                  )
                : null,
            filled: true,
            fillColor: AppColors.surface,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppColors.border, width: 1),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppColors.border, width: 1),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                  color: AppColors.interviewColor, width: 1.5),
            ),
          ),
        ),
      ),
    );
  }

  SliverToBoxAdapter _buildTabBar(List<_Question> all) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: SizedBox(
          height: 40,
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            indicator: BoxDecoration(
              color: AppColors.interviewColor.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: AppColors.interviewColor.withValues(alpha: 0.4)),
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: Colors.transparent,
            labelColor: AppColors.interviewColor,
            unselectedLabelColor: AppColors.textHint,
            labelStyle: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.w700),
            unselectedLabelStyle: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.w500),
            tabs: _sectionOrder.map((s) {
              final count = s == 'All'
                  ? all.length
                  : all.where((q) => q.section == s).length;
              return Tab(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text('$s ($count)'),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptySearch() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded,
              size: 48, color: AppColors.textHint.withValues(alpha: 0.5)),
          const SizedBox(height: 12),
          Text(
            'No questions match "$_searchQuery"',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionList(
      Map<String, List<_Question>> grouped, List<_Question> all) {
    final sections = _sectionOrder
        .where((s) => s != 'All' && grouped.containsKey(s))
        .toList();
    // add any sections not in predefined order
    for (final s in grouped.keys) {
      if (!sections.contains(s)) sections.add(s);
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      physics: const BouncingScrollPhysics(),
      children: [
        // Stats row
        _buildStatsRow(all),
        const SizedBox(height: 20),

        for (final section in sections) ...[
          if (_selectedSection == 'All') ...[
            _SectionHeader(
              section: section,
              count: grouped[section]!.length,
              meta: _sectionMeta[section],
            ),
            const SizedBox(height: 10),
          ],
          ...grouped[section]!.asMap().entries.map((entry) {
            final idx = entry.key;
            final q = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _QuestionCard(
                question: q,
                index: idx + 1,
                onSaveToggle: () => setState(() => q.saved = !q.saved),
              ),
            );
          }),
          if (_selectedSection == 'All') const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _buildStatsRow(List<_Question> all) {
    final filtered = _filter(all);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border:
            Border.all(color: AppColors.border, width: 1),
      ),
      child: Row(
        children: [
          _StatItem(
            label: 'Total',
            value: '${all.length}',
            color: AppColors.interviewColor,
          ),
          _Divider(),
          _StatItem(
            label: 'Showing',
            value: '${filtered.length}',
            color: AppColors.primary,
          ),
          _Divider(),
          _StatItem(
            label: 'Sections',
            value: '${_sectionMeta.length}',
            color: AppColors.secondary,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String section;
  final int count;
  final ({String label, IconData icon})? meta;

  const _SectionHeader({
    required this.section,
    required this.count,
    this.meta,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (meta != null) ...[
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppColors.interviewColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(9),
            ),
            child:
                Icon(meta!.icon, size: 14, color: AppColors.interviewColor),
          ),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                section,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
              ),
              if (meta != null)
                Text(
                  meta!.label,
                  style: const TextStyle(
                      color: AppColors.textHint, fontSize: 11),
                ),
            ],
          ),
        ),
        Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.interviewColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '$count Qs',
            style: const TextStyle(
              color: AppColors.interviewColor,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Card — expandable
// ─────────────────────────────────────────────────────────────────────────────
class _QuestionCard extends StatefulWidget {
  final _Question question;
  final int index;
  final VoidCallback onSaveToggle;

  const _QuestionCard({
    required this.question,
    required this.index,
    required this.onSaveToggle,
  });

  @override
  State<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<_QuestionCard> {
  bool _expanded = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() {
          _pressed = false;
          _expanded = !_expanded;
        });
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.985 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: _expanded
                ? AppColors.surfaceSoft
                : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _expanded
                  ? AppColors.interviewColor.withValues(alpha: 0.35)
                  : AppColors.border,
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Number badge
                    Container(
                      width: 26,
                      height: 26,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _expanded
                            ? AppColors.interviewColor.withValues(alpha: 0.18)
                            : AppColors.surfaceSoft,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${widget.index}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _expanded
                              ? AppColors.interviewColor
                              : AppColors.textHint,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.question.question,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _expanded
                              ? AppColors.textPrimary
                              : AppColors.textSecondary,
                          height: 1.45,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      children: [
                        GestureDetector(
                          onTap: widget.onSaveToggle,
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 200),
                            child: Icon(
                              widget.question.saved
                                  ? Icons.bookmark_rounded
                                  : Icons.bookmark_border_rounded,
                              key: ValueKey(widget.question.saved),
                              size: 20,
                              color: widget.question.saved
                                  ? AppColors.interviewColor
                                  : AppColors.textHint,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        AnimatedRotation(
                          turns: _expanded ? 0.5 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 18,
                            color: AppColors.textHint,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Expanded hint panel
              AnimatedCrossFade(
                firstChild: const SizedBox.shrink(),
                secondChild: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(54, 0, 16, 16),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.interviewColor.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.interviewColor
                              .withValues(alpha: 0.18)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.lightbulb_outline_rounded,
                                size: 13, color: AppColors.interviewColor),
                            const SizedBox(width: 6),
                            const Text(
                              'How to approach',
                              style: TextStyle(
                                color: AppColors.interviewColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _getHint(widget.question.section),
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                crossFadeState: _expanded
                    ? CrossFadeState.showSecond
                    : CrossFadeState.showFirst,
                duration: const Duration(milliseconds: 220),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getHint(String section) {
    switch (section) {
      case 'CIQ 1':
        return 'Be specific — mention class names, scores, teacher names. Honesty matters more than a perfect record. Show self-awareness and growth.';
      case 'CIQ 2':
        return 'Show family values and emotional intelligence. Speak positively. Avoid complaints — frame challenges as learning experiences.';
      case 'CIQ 3':
        return 'Connect hobbies to OLQ traits: leadership, teamwork, initiative. Be ready to discuss how a hobby has shaped your character.';
      case 'CIQ 4':
        return 'Stay current on recent news, especially defence and India\'s geopolitics. Know your sport inside-out — rules, key events, Indian players.';
      case 'CIQ 6':
        return 'Know your preferred service, rank structure, key bases, training academies, and recent indigenous defence equipment. Show genuine motivation.';
      case 'Self Assessment':
        return 'Give real-life examples for strengths. For weaknesses, show that you\'re aware and actively working on them — never deny having weaknesses.';
      default:
        return 'Answer confidently and honestly. The IO values clarity and authenticity over rehearsed answers.';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatItem(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  color: color,
                  fontSize: 20,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textHint, fontSize: 11)),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: 1,
        height: 32,
        color: AppColors.border,
        margin: const EdgeInsets.symmetric(horizontal: 8),
      );
}
