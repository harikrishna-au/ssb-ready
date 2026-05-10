import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/oir_result_model.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile'),
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is! AuthAuthenticated) {
            return const Center(
                child: Text('Please log in to see your profile.'));
          }

          final user = state.user;
          final userId = user.id;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildProfileCard(user),
                const SizedBox(height: 24),
                const Text(
                  'Performance Analytics',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                _buildOirAnalytics(context, userId),
                const SizedBox(height: 16),
                _buildTestCountCards(context, userId),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileCard(dynamic user) {
    final fullName = '${user.firstName ?? ''} ${user.lastName ?? ''}'.trim();
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: AppColors.brandGradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: Colors.white.withValues(alpha: 0.2),
            child: Text(
              (user.firstName ?? 'A')[0].toUpperCase(),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName.isNotEmpty ? fullName : 'Aspirant',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user.email ?? '',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    user.userType?.isNotEmpty == true
                        ? user.userType!
                        : 'No Entry Selected',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOirAnalytics(BuildContext context, String userId) {
    return FutureBuilder<List<OirResultModel>>(
      future: context.read<TestHistoryRepository>().getOirHistory(userId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
              child: Padding(
            padding: EdgeInsets.all(20),
            child: CircularProgressIndicator(),
          ));
        }

        final results = snapshot.data ?? [];

        if (results.isEmpty) {
          return _buildEmptyCard(
            'OIR Score Trend',
            'Complete an OIR test to start tracking your reasoning scores.',
            Icons.show_chart,
          );
        }

        // Show last 5 scores as a simple visual bar chart
        final recentResults = results.take(5).toList().reversed.toList();

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Colors.white, AppColors.surfaceSoft],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 7),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.show_chart, color: AppColors.secondary, size: 22),
                  SizedBox(width: 8),
                  Text(
                    'OIR Score Trend',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Last ${recentResults.length} attempts',
                style: TextStyle(fontSize: 13, color: Colors.grey[500]),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 120,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: recentResults.asMap().entries.map((entry) {
                    final result = entry.value;
                    final percentage = result.totalQuestions > 0
                        ? result.score / result.totalQuestions
                        : 0.0;
                    final barHeight = 100.0 * percentage;

                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              '${result.score}/${result.totalQuestions}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              height: barHeight.clamp(8.0, 100.0),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.secondaryLight,
                                    AppColors.secondary,
                                  ],
                                  begin: Alignment.bottomCenter,
                                  end: Alignment.topCenter,
                                ),
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '#${entry.key + 1}',
                              style: TextStyle(
                                  fontSize: 10, color: Colors.grey[500]),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTestCountCards(BuildContext context, String userId) {
    final repo = context.read<TestHistoryRepository>();

    return FutureBuilder(
      future: Future.wait([
        repo.getOirHistory(userId),
        repo.getPpdtHistory(userId),
        repo.getWatHistory(userId),
        repo.getSrtHistory(userId),
        repo.getTatHistory(userId),
      ]),
      builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox();
        }

        final oirCount =
            (snapshot.data?[0] as List<OirResultModel>?)?.length ?? 0;
        final ppdtCount =
            (snapshot.data?[1] as List<PpdtResultModel>?)?.length ?? 0;
        final watCount =
            (snapshot.data?[2] as List<WatResultModel>?)?.length ?? 0;
        final srtCount =
            (snapshot.data?[3] as List<SrtResultModel>?)?.length ?? 0;
        final tatCount =
            (snapshot.data?[4] as List<TatResultModel>?)?.length ?? 0;
        final totalTests =
            oirCount + ppdtCount + watCount + srtCount + tatCount;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surfaceSoft,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.military_tech,
                        color: AppColors.secondary, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Total Tests Completed',
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        Text(
                          '$totalTests',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                    child: _buildMiniStatCard('OIR', oirCount,
                        Icons.psychology_outlined, AppColors.primaryGreen)),
                const SizedBox(width: 10),
                Expanded(
                    child: _buildMiniStatCard('PPDT', ppdtCount,
                        Icons.image_outlined, AppColors.secondary)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                    child: _buildMiniStatCard('WAT', watCount,
                        Icons.text_fields_rounded, AppColors.accent)),
                const SizedBox(width: 10),
                Expanded(
                    child: _buildMiniStatCard('SRT', srtCount,
                        Icons.flash_on_rounded, AppColors.secondary)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                    child: _buildMiniStatCard('TAT', tatCount,
                        Icons.image_search_rounded, AppColors.primary)),
                const Expanded(child: SizedBox()),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _buildMiniStatCard(
      String label, int count, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.14)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                    fontWeight: FontWeight.w500),
              ),
              Text(
                '$count',
                style: TextStyle(
                    fontSize: 22, fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCard(String title, String message, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.08),
            blurRadius: 14,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            child: Icon(icon, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
