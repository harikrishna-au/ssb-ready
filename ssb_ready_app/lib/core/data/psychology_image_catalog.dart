import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:math';

class PsychologyImageAsset {
  final String imageUrl;
  final String description;

  const PsychologyImageAsset({required this.imageUrl, required this.description});
}

class PsychologyImageCatalog {
  static const String _bucketName = 'ppdt-tat-images';
  static const int previewImageCount = 5;
  static final Random _random = Random();

  static const List<String> _tatDescriptions = [
    'A group of people are standing near a river bank. One person appears to be pointing towards the water while others look concerned.',
    'A young man sits alone at a desk in a dimly lit room, with papers scattered around him and a clock on the wall showing midnight.',
    'Two people are shaking hands in front of a large building, while a third person watches from a distance with folded arms.',
    'A person in uniform is walking through a forest trail carrying a heavy backpack, with storm clouds gathering overhead.',
    'A family is gathered around a dining table. The elderly person at the head of the table appears to be making an announcement.',
  ];

  static String get bucketName =>
      (dotenv.env['PSYCHOLOGY_IMAGE_BUCKET'] ?? _bucketName).trim();

  static String get baseUrl {
    final raw = (dotenv.env['SUPABASE_URL'] ?? '').trim();
    if (raw.isEmpty) return '';
    return raw.replaceAll(RegExp(r'/+$'), '');
  }

  static String _publicUrl(String objectPath) {
    final sanitizedPath = objectPath.replaceAll('\\', '/').replaceFirst(RegExp(r'^/+'), '');
    if (baseUrl.isEmpty) return '';
    return '$baseUrl/storage/v1/object/public/$bucketName/$sanitizedPath';
  }

  static List<String> get ppdtImageUrls => List.unmodifiable(
        List.generate(
          45,
          (index) => _publicUrl('ppdt/ppdt${index + 1}.jpg'),
        ),
      );

  static List<String> get previewPpdtImageUrls {
    final preview = ppdtImageUrls.take(previewImageCount).toList();
    preview.shuffle(_random);
    return List.unmodifiable(preview);
  }

  static String randomPpdtImageUrl({required bool premium}) {
    final pool = premium ? ppdtImageUrls : previewPpdtImageUrls;
    if (pool.isEmpty) return '';
    return pool[_random.nextInt(pool.length)];
  }

  static List<PsychologyImageAsset> buildTatCards({required bool premium}) {
    final imagePool = premium ? ppdtImageUrls : previewPpdtImageUrls;
    final shuffledImages = imagePool.toList()..shuffle(_random);
    final cardCount = premium ? ppdtImageUrls.length : previewImageCount;
    return List.unmodifiable(
      List.generate(cardCount, (index) {
        final imageUrl = shuffledImages[index % shuffledImages.length];
        final description = index < _tatDescriptions.length
            ? _tatDescriptions[index]
            : 'A new scene appears. Observe the image and build a story around it.';
        return PsychologyImageAsset(imageUrl: imageUrl, description: description);
      }),
    );
  }

  static List<PsychologyImageAsset> get tatCards => List.unmodifiable(
        List.generate(
          previewImageCount,
          (index) => PsychologyImageAsset(
            imageUrl: previewPpdtImageUrls[index % previewPpdtImageUrls.length],
            description: _tatDescriptions[index],
          ),
        ),
      );
}