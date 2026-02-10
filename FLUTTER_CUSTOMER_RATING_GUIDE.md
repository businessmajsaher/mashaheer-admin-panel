# Flutter Customer App - Rating System Guide

## Overview

This guide shows how to add rating functionality to the Flutter customer app, allowing customers to rate and review completed services (bookings with "Published" status).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Schema](#database-schema)
3. [Data Models](#data-models)
4. [API Service](#api-service)
5. [State Management](#state-management)
6. [UI Screens](#ui-screens)
7. [Integration Steps](#integration-steps)
8. [Testing](#testing)

---

## Prerequisites

### 1. Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Supabase Flutter SDK (RECOMMENDED)
  supabase_flutter: ^2.5.6
  
  # OR use HTTP directly
  http: ^1.1.0
  
  # State management
  provider: ^6.1.1
  # OR
  bloc: ^8.1.2
  flutter_bloc: ^8.1.3
  
  # UI components
  flutter_rating_bar: ^4.0.1  # For star rating UI
  
  # Local storage
  shared_preferences: ^2.2.2
  
  # JSON handling
  json_annotation: ^4.8.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

### 2. Supabase Configuration

Ensure Supabase is initialized in your app:

```dart
// lib/main.dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  runApp(MyApp());
}
```

---

## Database Schema

The `ratings` table structure:

```sql
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  customer_id uuid NOT NULL,
  influencer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Key Points:**
- One rating per booking (UNIQUE constraint on `booking_id`)
- Rating must be between 1 and 5
- Customers can only rate their own bookings (enforced by RLS)
- Reviews can be updated by the customer

---

## Data Models

### Create `lib/models/rating.dart`:

```dart
import 'package:json_annotation/json_annotation.dart';

part 'rating.g.dart';

@JsonSerializable()
class Rating {
  final String id;
  final String bookingId;
  final String customerId;
  final String influencerId;
  final int rating; // 1-5
  final String? reviewText;
  final DateTime createdAt;
  final DateTime updatedAt;

  Rating({
    required this.id,
    required this.bookingId,
    required this.customerId,
    required this.influencerId,
    required this.rating,
    this.reviewText,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Rating.fromJson(Map<String, dynamic> json) => _$RatingFromJson(json);
  Map<String, dynamic> toJson() => _$RatingToJson(this);
}

@JsonSerializable()
class CreateRatingRequest {
  final String bookingId;
  final int rating; // 1-5
  final String? reviewText;

  CreateRatingRequest({
    required this.bookingId,
    required this.rating,
    this.reviewText,
  });

  Map<String, dynamic> toJson() => _$CreateRatingRequestToJson(this);
}

@JsonSerializable()
class UpdateRatingRequest {
  final int rating; // 1-5
  final String? reviewText;

  UpdateRatingRequest({
    required this.rating,
    this.reviewText,
  });

  Map<String, dynamic> toJson() => _$UpdateRatingRequestToJson(this);
}
```

**Generate the code:**

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

---

## API Service

### Create `lib/services/rating_service.dart`:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/rating.dart';

class RatingService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Get rating for a specific booking
  Future<Rating?> getRatingByBookingId(String bookingId) async {
    try {
      final response = await _supabase
          .from('ratings')
          .select()
          .eq('booking_id', bookingId)
          .maybeSingle();

      if (response == null) return null;
      return Rating.fromJson(response);
    } catch (e) {
      print('Error fetching rating: $e');
      rethrow;
    }
  }

  /// Get all ratings for a customer
  Future<List<Rating>> getMyRatings() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      final response = await _supabase
          .from('ratings')
          .select()
          .eq('customer_id', userId)
          .order('created_at', descending: true);

      return (response as List)
          .map((json) => Rating.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching my ratings: $e');
      rethrow;
    }
  }

  /// Get ratings for an influencer
  Future<List<Rating>> getInfluencerRatings(String influencerId) async {
    try {
      final response = await _supabase
          .from('ratings')
          .select()
          .eq('influencer_id', influencerId)
          .order('created_at', descending: true);

      return (response as List)
          .map((json) => Rating.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching influencer ratings: $e');
      rethrow;
    }
  }

  /// Create a new rating
  Future<Rating> createRating(CreateRatingRequest request) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      // Get booking details to get influencer_id
      final bookingResponse = await _supabase
          .from('bookings')
          .select('influencer_id')
          .eq('id', request.bookingId)
          .single();

      final influencerId = bookingResponse['influencer_id'] as String;

      final response = await _supabase
          .from('ratings')
          .insert({
            'booking_id': request.bookingId,
            'customer_id': userId,
            'influencer_id': influencerId,
            'rating': request.rating,
            'review_text': request.reviewText,
          })
          .select()
          .single();

      return Rating.fromJson(response);
    } catch (e) {
      print('Error creating rating: $e');
      rethrow;
    }
  }

  /// Update an existing rating
  Future<Rating> updateRating(String ratingId, UpdateRatingRequest request) async {
    try {
      final response = await _supabase
          .from('ratings')
          .update({
            'rating': request.rating,
            'review_text': request.reviewText,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', ratingId)
          .select()
          .single();

      return Rating.fromJson(response);
    } catch (e) {
      print('Error updating rating: $e');
      rethrow;
    }
  }

  /// Delete a rating
  Future<void> deleteRating(String ratingId) async {
    try {
      await _supabase
          .from('ratings')
          .delete()
          .eq('id', ratingId);
    } catch (e) {
      print('Error deleting rating: $e');
      rethrow;
    }
  }

  /// Check if a booking can be rated (must be Published and not already rated)
  Future<bool> canRateBooking(String bookingId) async {
    try {
      // Check if booking is Published
      final bookingResponse = await _supabase
          .from('bookings')
          .select('status:booking_statuses(name)')
          .eq('id', bookingId)
          .single();

      final statusName = bookingResponse['status']?['name'] as String?;
      if (statusName != 'Published') {
        return false; // Booking not completed
      }

      // Check if already rated
      final ratingResponse = await _supabase
          .from('ratings')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle();

      return ratingResponse == null; // Can rate if no rating exists
    } catch (e) {
      print('Error checking if can rate: $e');
      return false;
    }
  }
}
```

---

## State Management

### Option A: Using Provider

#### Create `lib/providers/rating_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../models/rating.dart';
import '../services/rating_service.dart';

class RatingProvider with ChangeNotifier {
  final RatingService _ratingService = RatingService();

  Rating? _currentRating;
  bool _isLoading = false;
  String? _error;

  Rating? get currentRating => _currentRating;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Load rating for a booking
  Future<void> loadRatingForBooking(String bookingId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentRating = await _ratingService.getRatingByBookingId(bookingId);
      _error = null;
    } catch (e) {
      _error = e.toString();
      _currentRating = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create a new rating
  Future<bool> createRating(CreateRatingRequest request) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentRating = await _ratingService.createRating(request);
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update an existing rating
  Future<bool> updateRating(String ratingId, UpdateRatingRequest request) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentRating = await _ratingService.updateRating(ratingId, request);
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

### Option B: Using BLoC

#### Create `lib/bloc/rating/rating_event.dart`:

```dart
import 'package:equatable/equatable.dart';
import '../../models/rating.dart';

abstract class RatingEvent extends Equatable {
  const RatingEvent();

  @override
  List<Object> get props => [];
}

class LoadRatingForBooking extends RatingEvent {
  final String bookingId;
  const LoadRatingForBooking(this.bookingId);
  
  @override
  List<Object> get props => [bookingId];
}

class CreateRating extends RatingEvent {
  final CreateRatingRequest request;
  const CreateRating(this.request);
  
  @override
  List<Object> get props => [request];
}

class UpdateRating extends RatingEvent {
  final String ratingId;
  final UpdateRatingRequest request;
  const UpdateRating(this.ratingId, this.request);
  
  @override
  List<Object> get props => [ratingId, request];
}
```

#### Create `lib/bloc/rating/rating_state.dart`:

```dart
import 'package:equatable/equatable.dart';
import '../../models/rating.dart';

abstract class RatingState extends Equatable {
  const RatingState();

  @override
  List<Object> get props => [];
}

class RatingInitial extends RatingState {}

class RatingLoading extends RatingState {}

class RatingLoaded extends RatingState {
  final Rating? rating;
  const RatingLoaded(this.rating);
  
  @override
  List<Object> get props => [rating ?? ''];
}

class RatingError extends RatingState {
  final String message;
  const RatingError(this.message);
  
  @override
  List<Object> get props => [message];
}

class RatingSuccess extends RatingState {
  final Rating rating;
  const RatingSuccess(this.rating);
  
  @override
  List<Object> get props => [rating];
}
```

#### Create `lib/bloc/rating/rating_bloc.dart`:

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../models/rating.dart';
import '../../services/rating_service.dart';
import 'rating_event.dart';
import 'rating_state.dart';

class RatingBloc extends Bloc<RatingEvent, RatingState> {
  final RatingService _ratingService = RatingService();

  RatingBloc() : super(RatingInitial()) {
    on<LoadRatingForBooking>(_onLoadRatingForBooking);
    on<CreateRating>(_onCreateRating);
    on<UpdateRating>(_onUpdateRating);
  }

  Future<void> _onLoadRatingForBooking(
    LoadRatingForBooking event,
    Emitter<RatingState> emit,
  ) async {
    emit(RatingLoading());
    try {
      final rating = await _ratingService.getRatingByBookingId(event.bookingId);
      emit(RatingLoaded(rating));
    } catch (e) {
      emit(RatingError(e.toString()));
    }
  }

  Future<void> _onCreateRating(
    CreateRating event,
    Emitter<RatingState> emit,
  ) async {
    emit(RatingLoading());
    try {
      final rating = await _ratingService.createRating(event.request);
      emit(RatingSuccess(rating));
    } catch (e) {
      emit(RatingError(e.toString()));
    }
  }

  Future<void> _onUpdateRating(
    UpdateRating event,
    Emitter<RatingState> emit,
  ) async {
    emit(RatingLoading());
    try {
      final rating = await _ratingService.updateRating(
        event.ratingId,
        event.request,
      );
      emit(RatingSuccess(rating));
    } catch (e) {
      emit(RatingError(e.toString()));
    }
  }
}
```

---

## UI Screens

### Create `lib/screens/rating_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:provider/provider.dart';
import '../models/rating.dart';
import '../providers/rating_provider.dart';

class RatingScreen extends StatefulWidget {
  final String bookingId;
  final String? influencerName;
  final String? serviceTitle;

  const RatingScreen({
    Key? key,
    required this.bookingId,
    this.influencerName,
    this.serviceTitle,
  }) : super(key: key);

  @override
  State<RatingScreen> createState() => _RatingScreenState();
}

class _RatingScreenState extends State<RatingScreen> {
  final _reviewController = TextEditingController();
  double _selectedRating = 0.0;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Load existing rating if any
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RatingProvider>().loadRatingForBooking(widget.bookingId);
    });
  }

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  Future<void> _submitRating() async {
    if (_selectedRating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a rating')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final provider = context.read<RatingProvider>();
    final existingRating = provider.currentRating;

    final request = existingRating == null
        ? CreateRatingRequest(
            bookingId: widget.bookingId,
            rating: _selectedRating.toInt(),
            reviewText: _reviewController.text.isEmpty
                ? null
                : _reviewController.text,
          )
        : UpdateRatingRequest(
            rating: _selectedRating.toInt(),
            reviewText: _reviewController.text.isEmpty
                ? null
                : _reviewController.text,
          );

    final success = existingRating == null
        ? await provider.createRating(request as CreateRatingRequest)
        : await provider.updateRating(
            existingRating.id,
            request as UpdateRatingRequest,
          );

    setState(() => _isSubmitting = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rating submitted successfully!')),
      );
      Navigator.of(context).pop(true); // Return true to indicate success
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'Failed to submit rating'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rate Service'),
      ),
      body: Consumer<RatingProvider>(
        builder: (context, provider, child) {
          // Load existing rating if available
          if (provider.currentRating != null && _selectedRating == 0) {
            _selectedRating = provider.currentRating!.rating.toDouble();
            _reviewController.text = provider.currentRating!.reviewText ?? '';
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Service Info
                if (widget.serviceTitle != null || widget.influencerName != null)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.serviceTitle != null)
                            Text(
                              widget.serviceTitle!,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          if (widget.influencerName != null)
                            Text(
                              'by ${widget.influencerName}',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[600],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                const SizedBox(height: 24),

                // Rating Section
                const Text(
                  'How would you rate this service?',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: RatingBar.builder(
                    initialRating: _selectedRating,
                    minRating: 1,
                    direction: Axis.horizontal,
                    allowHalfRating: false,
                    itemCount: 5,
                    itemPadding: const EdgeInsets.symmetric(horizontal: 4.0),
                    itemBuilder: (context, _) => const Icon(
                      Icons.star,
                      color: Colors.amber,
                    ),
                    onRatingUpdate: (rating) {
                      setState(() {
                        _selectedRating = rating;
                      });
                    },
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    _selectedRating > 0
                        ? '${_selectedRating.toInt()} out of 5 stars'
                        : 'Tap to rate',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Review Text Section
                const Text(
                  'Write a review (optional)',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _reviewController,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    hintText: 'Share your experience...',
                    border: OutlineInputBorder(),
                  ),
                ),

                const SizedBox(height: 32),

                // Submit Button
                ElevatedButton(
                  onPressed: _isSubmitting || provider.isLoading
                      ? null
                      : _submitRating,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.blue,
                  ),
                  child: _isSubmitting || provider.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Submit Rating',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
```

---

## Integration Steps

### 1. Add Rating Button to Completed Bookings

In your bookings list screen, add a "Rate" button for Published bookings:

```dart
// In your booking card/item widget
if (booking.status?.name == 'Published') {
  // Check if already rated
  FutureBuilder<bool>(
    future: ratingService.canRateBooking(booking.id),
    builder: (context, snapshot) {
      if (snapshot.data == true) {
        return ElevatedButton.icon(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => RatingScreen(
                  bookingId: booking.id,
                  influencerName: booking.influencer?.name,
                  serviceTitle: booking.service?.title,
                ),
              ),
            ).then((success) {
              if (success == true) {
                // Refresh bookings list
                // Your refresh logic here
              }
            });
          },
          icon: const Icon(Icons.star_outline),
          label: const Text('Rate Service'),
        );
      } else {
        return TextButton.icon(
          onPressed: () {
            // Show existing rating
            // Navigate to view rating screen
          },
          icon: const Icon(Icons.star),
          label: const Text('View Rating'),
        );
      }
    },
  );
}
```

### 2. Update Main App with Provider

```dart
// lib/main.dart
import 'package:provider/provider.dart';
import 'providers/rating_provider.dart';

void main() {
  // ... Supabase initialization ...
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => RatingProvider()),
        // ... other providers ...
      ],
      child: MyApp(),
    ),
  );
}
```

### 3. Or Update Main App with BLoC

```dart
// lib/main.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'bloc/rating/rating_bloc.dart';

void main() {
  // ... Supabase initialization ...
  
  runApp(
    MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => RatingBloc()),
        // ... other blocs ...
      ],
      child: MyApp(),
    ),
  );
}
```

---

## Testing

### 1. Test Rating Creation

```dart
// Test in your app
final ratingService = RatingService();

// Check if can rate
final canRate = await ratingService.canRateBooking('booking-id');
print('Can rate: $canRate');

// Create rating
final rating = await ratingService.createRating(
  CreateRatingRequest(
    bookingId: 'booking-id',
    rating: 5,
    reviewText: 'Great service!',
  ),
);
print('Rating created: ${rating.id}');
```

### 2. Test Rating Update

```dart
// Update existing rating
final updated = await ratingService.updateRating(
  'rating-id',
  UpdateRatingRequest(
    rating: 4,
    reviewText: 'Updated review',
  ),
);
print('Rating updated: ${updated.id}');
```

### 3. Verify in Database

```sql
-- Check ratings in Supabase SQL Editor
SELECT 
  r.*,
  b.id as booking_id,
  s.title as service_title,
  p.name as influencer_name
FROM ratings r
JOIN bookings b ON b.id = r.booking_id
JOIN services s ON s.id = b.service_id
JOIN profiles p ON p.id = r.influencer_id
ORDER BY r.created_at DESC;
```

---

## Summary

✅ **Database**: Ratings table with RLS policies  
✅ **Models**: Rating, CreateRatingRequest, UpdateRatingRequest  
✅ **Service**: RatingService with CRUD operations  
✅ **State Management**: Provider or BLoC  
✅ **UI**: Rating screen with star rating and review text  
✅ **Integration**: Add "Rate" button to completed bookings  

**Next Steps:**
1. Add dependencies to `pubspec.yaml`
2. Create data models and run `build_runner`
3. Create rating service
4. Add rating provider/bloc
5. Create rating screen UI
6. Integrate into bookings list
7. Test with real bookings

---

**Last Updated**: Flutter Customer App Rating System Guide


