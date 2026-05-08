class PiqModel {
  final String userId;
  final String fullName;
  final String placeOfResidence;
  final String state;
  final String district;
  final String religion;
  final String scStObc;
  final String motherTongue;
  final DateTime dateOfBirth;
  final String maritalStatus;
  
  // Educational Info
  final String tenthPercentage;
  final String twelfthPercentage;
  final String graduationPercentage;
  final String achievements;

  // Family Info
  final String fatherOccupation;
  final String fatherIncome;
  final String motherOccupation;
  
  // Activities
  final String gamesSports;
  final String hobbies;
  final String nccTraining;
  final String responsibilitiesHeld;

  PiqModel({
    required this.userId,
    this.fullName = '',
    this.placeOfResidence = '',
    this.state = '',
    this.district = '',
    this.religion = '',
    this.scStObc = '',
    this.motherTongue = '',
    DateTime? dob,
    this.maritalStatus = '',
    this.tenthPercentage = '',
    this.twelfthPercentage = '',
    this.graduationPercentage = '',
    this.achievements = '',
    this.fatherOccupation = '',
    this.fatherIncome = '',
    this.motherOccupation = '',
    this.gamesSports = '',
    this.hobbies = '',
    this.nccTraining = '',
    this.responsibilitiesHeld = '',
  }) : dateOfBirth = dob ?? DateTime(2000);

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'fullName': fullName,
      'placeOfResidence': placeOfResidence,
      'state': state,
      'district': district,
      'religion': religion,
      'scStObc': scStObc,
      'motherTongue': motherTongue,
      'dateOfBirth': dateOfBirth.toIso8601String(),
      'maritalStatus': maritalStatus,
      'tenthPercentage': tenthPercentage,
      'twelfthPercentage': twelfthPercentage,
      'graduationPercentage': graduationPercentage,
      'achievements': achievements,
      'fatherOccupation': fatherOccupation,
      'fatherIncome': fatherIncome,
      'motherOccupation': motherOccupation,
      'gamesSports': gamesSports,
      'hobbies': hobbies,
      'nccTraining': nccTraining,
      'responsibilitiesHeld': responsibilitiesHeld,
    };
  }

  factory PiqModel.fromJson(Map<String, dynamic> json) {
    return PiqModel(
      userId: json['userId'] ?? '',
      fullName: json['fullName'] ?? '',
      placeOfResidence: json['placeOfResidence'] ?? '',
      state: json['state'] ?? '',
      district: json['district'] ?? '',
      religion: json['religion'] ?? '',
      scStObc: json['scStObc'] ?? '',
      motherTongue: json['motherTongue'] ?? '',
      dob: json['dateOfBirth'] != null ? DateTime.parse(json['dateOfBirth']) : null,
      maritalStatus: json['maritalStatus'] ?? '',
      tenthPercentage: json['tenthPercentage'] ?? '',
      twelfthPercentage: json['twelfthPercentage'] ?? '',
      graduationPercentage: json['graduationPercentage'] ?? '',
      achievements: json['achievements'] ?? '',
      fatherOccupation: json['fatherOccupation'] ?? '',
      fatherIncome: json['fatherIncome'] ?? '',
      motherOccupation: json['motherOccupation'] ?? '',
      gamesSports: json['gamesSports'] ?? '',
      hobbies: json['hobbies'] ?? '',
      nccTraining: json['nccTraining'] ?? '',
      responsibilitiesHeld: json['responsibilitiesHeld'] ?? '',
    );
  }

  PiqModel copyWith({
    String? fullName,
    String? placeOfResidence,
    String? state,
    String? district,
    String? religion,
    String? scStObc,
    String? motherTongue,
    DateTime? dob,
    String? maritalStatus,
    String? tenthPercentage,
    String? twelfthPercentage,
    String? graduationPercentage,
    String? achievements,
    String? fatherOccupation,
    String? fatherIncome,
    String? motherOccupation,
    String? gamesSports,
    String? hobbies,
    String? nccTraining,
    String? responsibilitiesHeld,
  }) {
    return PiqModel(
      userId: userId,
      fullName: fullName ?? this.fullName,
      placeOfResidence: placeOfResidence ?? this.placeOfResidence,
      state: state ?? this.state,
      district: district ?? this.district,
      religion: religion ?? this.religion,
      scStObc: scStObc ?? this.scStObc,
      motherTongue: motherTongue ?? this.motherTongue,
      dob: dob ?? dateOfBirth,
      maritalStatus: maritalStatus ?? this.maritalStatus,
      tenthPercentage: tenthPercentage ?? this.tenthPercentage,
      twelfthPercentage: twelfthPercentage ?? this.twelfthPercentage,
      graduationPercentage: graduationPercentage ?? this.graduationPercentage,
      achievements: achievements ?? this.achievements,
      fatherOccupation: fatherOccupation ?? this.fatherOccupation,
      fatherIncome: fatherIncome ?? this.fatherIncome,
      motherOccupation: motherOccupation ?? this.motherOccupation,
      gamesSports: gamesSports ?? this.gamesSports,
      hobbies: hobbies ?? this.hobbies,
      nccTraining: nccTraining ?? this.nccTraining,
      responsibilitiesHeld: responsibilitiesHeld ?? this.responsibilitiesHeld,
    );
  }
}
