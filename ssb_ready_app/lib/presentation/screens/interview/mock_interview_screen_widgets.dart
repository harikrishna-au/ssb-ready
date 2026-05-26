
part of 'package:ssb_ready_app/presentation/screens/interview/mock_interview_screen.dart';

extension _MockInterviewScreenWidgets on _MockInterviewScreenState {
  Widget _buildAvatarPanel(InterviewState state) {
    final visemeAsset = _ttsSpeaking ? _visemeFrameAssets[_visemeIdx] : _visemeFrameAssets[0];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1B1B34), Color(0xFF3B2268)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 220,
            width: 220,
            child: Stack(
              fit: StackFit.expand,
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                  child: const SizedBox.expand(),
                ),
                ClipOval(
                  clipBehavior: Clip.antiAlias,
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.asset('assets/nilo/avatar_base.png', fit: BoxFit.contain),
                        AnimatedOpacity(
                          duration: const Duration(milliseconds: 80),
                          opacity: _blinkOn ? 1 : 0,
                          child: Image.asset('assets/nilo/avatar_blink.gif', fit: BoxFit.contain),
                        ),
                        IgnorePointer(
                          child: Align(
                            alignment: const Alignment(-0.002, -0.05),
                            child: SizedBox(
                              width: 45,
                              height: 34,
                              child: SvgPicture.asset(visemeAsset, fit: BoxFit.contain),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white24, width: 1.5),
                    ),
                    child: const SizedBox.expand(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          _buildStatusChip(state.status),
          const SizedBox(height: 8),
          const Text(
            'Speak naturally. Nilo will ask follow-up questions.',
            style: TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(InterviewStatus status) {
    String label = 'Tap to speak';
    Color color = Colors.white70;
    if (status == InterviewStatus.loading) {
      label = 'Analyzing...';
      color = const Color(0xFFFFE082);
    } else if (status == InterviewStatus.interviewing) {
      if (_ttsSpeaking) {
        label = 'Nilo speaking';
        color = const Color(0xFF9BE7A5);
      } else {
        label = 'Your turn';
        color = const Color(0xFFB3E5FC);
      }
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            status == InterviewStatus.loading
                ? Icons.hourglass_top
                : _ttsSpeaking
                    ? Icons.volume_up_rounded
                    : Icons.mic_none,
            color: color,
            size: 14,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(String content, bool isUser) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isUser ? Colors.purple[700] : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 0),
            bottomRight: Radius.circular(isUser ? 0 : 16),
          ),
        ),
        child: Text(
          content,
          style: TextStyle(
            color: isUser ? Colors.white : Colors.black87,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Text('IO is thinking...', style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
      ),
    );
  }

  Widget _buildEndInterviewDialog() {
    return Material(
      color: Colors.transparent,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 18),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 12)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Finish Interview?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
              'Are you sure you want to end this interview now?',
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => _setShowEndConfirm(false),
                  child: const Text('Continue'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    _setShowEndConfirm(false);
                    Navigator.pop(context);
                  },
                  child: const Text('End'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionBank(List<Map<String, String>> bank) {
    final top = bank.take(8).toList();
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
      color: Colors.purple.withValues(alpha: 0.04),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Practice prompts',
            style: TextStyle(
              color: Colors.purple[800],
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: top.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final item = top[index];
                final question = item['question'] ?? '';
                final section = item['section'] ?? '';
                return ActionChip(
                  label: Text(
                    section.isEmpty ? question : '$section: $question',
                    overflow: TextOverflow.ellipsis,
                  ),
                  onPressed: () {
                    _messageController.text = question;
                    _messageController.selection = TextSelection.collapsed(
                      offset: _messageController.text.length,
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(InterviewState state) {
    final isLoading = state.status == InterviewStatus.loading;
    final micDisabled = isLoading;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 5, offset: const Offset(0, -2))],
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: micDisabled
                  ? Colors.grey.shade300
                  : _isListening
                      ? Colors.red.shade700
                      : Colors.purple.shade700,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              tooltip: _isListening ? 'Stop recording' : 'Speak your answer',
              onPressed: micDisabled ? null : () => unawaited(_toggleMicListen()),
              icon: Icon(
                _isListening ? Icons.stop : Icons.mic,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: _speechReady
                    ? 'Type or tap mic to speak…'
                    : 'Type your response (enable mic permission for voice)…',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: isLoading ? null : _sendMessage,
            icon: Icon(Icons.send, color: isLoading ? Colors.grey : Colors.purple[700]),
          ),
        ],
      ),
    );
  }
}
