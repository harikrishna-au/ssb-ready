# Flutter Starter Template (Bloc + Clean Architecture + Responsive UI)

A production-ready Flutter starter template built using **Bloc**, **Clean Architecture**, and a **Responsive UI** layout that supports **Android**, **iOS**, and **Web** platforms.

This project provides a scalable base for new Flutter applications that require structure, performance, and flexibility across multiple platforms.

---

## ✨ Key Features

- ✅ **Clean Architecture** — Clear separation of concerns
- ✅ **Bloc State Management** — Predictable, testable, and scalable
- ✅ **Responsive Layout** — Supports Mobile, Tablet, Desktop (Web)
- ✅ **Cross-Platform** — Android, iOS, Web ready
- ✅ **Named Routing** — Centralized route management
- ✅ **Modular Structure** — Easy to scale and maintain
- ✅ **Service & Repository Layers** — Abstracted business logic and APIs

---

## ⚙️ Getting Started

### Prerequisites

- Flutter 3.16.0 or above
- Dart 3.2.0 or above
- Android Studio or VS Code
- Chrome (for Web testing)
- Xcode (for iOS builds)

---

### Installation

```bash
git clone https://github.com/your-username/flutter-starter-template.git
cd flutter-starter-template
flutter pub get


## Running the app

flutter run -d android   # Android
flutter run -d ios       # iOS
flutter run -d chrome    # Web


## Installation

lib/
├── blocs/               # Feature-wise Bloc logic
│   └── home/
│       ├── home_bloc.dart
│       ├── home_event.dart
│       └── home_state.dart
├── config/              # Global themes and environment setup
├── constants/           # Static values (colors, strings)
├── models/              # Data models
├── repositories/        # Interfaces and data providers
├── routes/              # App-wide navigation routes
├── screens/             # Feature-specific UIs
│   └── home/
│       ├── home_screen.dart
│       ├── mobile_view.dart
│       ├── tablet_view.dart
│       └── desktop_view.dart
├── services/            # APIs and shared services
├── utils/               # Helper utilities
│   └── responsive_layout.dart
├── widgets/             # Shared components (buttons, cards, etc.)
└── main.dart            # App entry point
