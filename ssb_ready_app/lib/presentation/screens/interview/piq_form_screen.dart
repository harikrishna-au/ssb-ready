import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc_state.dart';

class PiqFormScreen extends StatefulWidget {
  const PiqFormScreen({super.key});

  @override
  State<PiqFormScreen> createState() => _PiqFormScreenState();
}

class _PiqFormScreenState extends State<PiqFormScreen> {
  int _currentStep = 0;

  @override
  void initState() {
    super.initState();
    context.read<InterviewBloc>().add(LoadPiq());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital PIQ Form'),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
      ),
      body: BlocConsumer<InterviewBloc, InterviewState>(
        listener: (context, state) {
          if (state.status == InterviewStatus.success) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('PIQ Saved Successfully!')),
            );
          }
        },
        builder: (context, state) {
          if (state.status == InterviewStatus.loading && state.piq == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.piq == null) {
            return const Center(child: Text('Failed to load PIQ.'));
          }

          return Stepper(
            type: StepperType.vertical,
            currentStep: _currentStep,
            onStepTapped: (step) => setState(() => _currentStep = step),
            onStepContinue: () {
              if (_currentStep < 3) {
                setState(() => _currentStep += 1);
              } else {
                context.read<InterviewBloc>().add(SavePiq());
              }
            },
            onStepCancel: () {
              if (_currentStep > 0) {
                setState(() => _currentStep -= 1);
              }
            },
            steps: [
              _personalInfoStep(state),
              _educationalInfoStep(state),
              _familyInfoStep(state),
              _activitiesStep(state),
            ],
            controlsBuilder: (context, details) {
              return Padding(
                padding: const EdgeInsets.only(top: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: details.onStepContinue,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[700],
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text(_currentStep == 3 ? 'Save PIQ' : 'Next'),
                      ),
                    ),
                    if (_currentStep > 0) ...[
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: details.onStepCancel,
                          child: const Text('Back'),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Step _personalInfoStep(InterviewState state) {
    return Step(
      title: const Text('Personal Details'),
      isActive: _currentStep >= 0,
      state: _currentStep > 0 ? StepState.complete : StepState.editing,
      content: Column(
        children: [
          _buildTextField(
            label: 'Full Name',
            initialValue: state.piq!.fullName,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(fullName: val))),
          ),
          _buildTextField(
            label: 'Place of Residence',
            initialValue: state.piq!.placeOfResidence,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(placeOfResidence: val))),
          ),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  label: 'District',
                  initialValue: state.piq!.district,
                  onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(district: val))),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  label: 'State',
                  initialValue: state.piq!.state,
                  onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(state: val))),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Step _educationalInfoStep(InterviewState state) {
    return Step(
      title: const Text('Educational Background'),
      isActive: _currentStep >= 1,
      state: _currentStep > 1 ? StepState.complete : StepState.editing,
      content: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  label: '10th %',
                  initialValue: state.piq!.tenthPercentage,
                  onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(tenthPercentage: val))),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  label: '12th %',
                  initialValue: state.piq!.twelfthPercentage,
                  onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(twelfthPercentage: val))),
                ),
              ),
            ],
          ),
          _buildTextField(
            label: 'Graduation %',
            initialValue: state.piq!.graduationPercentage,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(graduationPercentage: val))),
          ),
          _buildTextField(
            label: 'Outstanding Achievements',
            initialValue: state.piq!.achievements,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(achievements: val))),
          ),
        ],
      ),
    );
  }

  Step _familyInfoStep(InterviewState state) {
    return Step(
      title: const Text('Family Background'),
      isActive: _currentStep >= 2,
      state: _currentStep > 2 ? StepState.complete : StepState.editing,
      content: Column(
        children: [
          _buildTextField(
            label: 'Father\'s Occupation',
            initialValue: state.piq!.fatherOccupation,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(fatherOccupation: val))),
          ),
          _buildTextField(
            label: 'Mother\'s Occupation',
            initialValue: state.piq!.motherOccupation,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(motherOccupation: val))),
          ),
        ],
      ),
    );
  }

  Step _activitiesStep(InterviewState state) {
    return Step(
      title: const Text('Activities & Interests'),
      isActive: _currentStep >= 3,
      state: _currentStep == 3 ? StepState.editing : StepState.complete,
      content: Column(
        children: [
          _buildTextField(
            label: 'Hobbies',
            initialValue: state.piq!.hobbies,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(hobbies: val))),
          ),
          _buildTextField(
            label: 'Games & Sports',
            initialValue: state.piq!.gamesSports,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(gamesSports: val))),
          ),
          _buildTextField(
            label: 'Responsibilities Held',
            initialValue: state.piq!.responsibilitiesHeld,
            onChanged: (val) => context.read<InterviewBloc>().add(UpdatePiqField(state.piq!.copyWith(responsibilitiesHeld: val))),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({required String label, required String initialValue, required Function(String) onChanged}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        initialValue: initialValue,
        onChanged: onChanged,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        ),
      ),
    );
  }
}
