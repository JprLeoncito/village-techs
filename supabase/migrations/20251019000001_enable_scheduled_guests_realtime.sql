-- Enable Realtime for scheduled_guests table
-- This allows WebSocket subscriptions to real-time database changes

ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_guests;