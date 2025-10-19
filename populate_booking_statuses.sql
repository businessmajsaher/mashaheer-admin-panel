-- Populate booking_statuses table with common statuses
-- Run this in your Supabase SQL Editor if the table is empty

-- Check if statuses already exist
-- SELECT * FROM booking_statuses;

-- Insert common booking statuses
INSERT INTO booking_statuses (name, description, "order") 
VALUES
  ('Pending', 'Booking request is awaiting approval from influencer', 1),
  ('Confirmed', 'Booking has been confirmed by influencer', 2),
  ('In Progress', 'Service delivery is in progress', 3),
  ('Script Submitted', 'Influencer has submitted script for customer approval', 4),
  ('Script Approved', 'Customer has approved the script', 5),
  ('Script Rejected', 'Customer has requested script revisions', 6),
  ('Completed', 'Service has been completed successfully', 7),
  ('Cancelled', 'Booking was cancelled by customer or influencer', 8),
  ('Expired', 'Booking expired without completion', 9)
ON CONFLICT (name) DO NOTHING;

-- Verify insertion
SELECT * FROM booking_statuses ORDER BY "order";

