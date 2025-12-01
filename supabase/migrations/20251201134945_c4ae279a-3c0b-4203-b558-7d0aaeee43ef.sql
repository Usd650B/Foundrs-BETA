-- Create enum for partnership status
CREATE TYPE partnership_status AS ENUM ('pending', 'active', 'declined', 'ended');

-- Create enum for founder stage
CREATE TYPE founder_stage AS ENUM ('idea', 'mvp', 'early_revenue', 'scaling', 'established');

-- Add founder stage to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founder_stage founder_stage DEFAULT 'idea';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create partnerships table
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status partnership_status DEFAULT 'pending' NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(requester_id, receiver_id)
);

-- Create messages table for direct messaging
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create shared milestones table
CREATE TABLE IF NOT EXISTS shared_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create video sessions table for standups
CREATE TABLE IF NOT EXISTS video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_url TEXT,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partnerships
CREATE POLICY "Users can view their own partnerships"
  ON partnerships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create partnership requests"
  ON partnerships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update partnerships they're part of"
  ON partnerships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their partnerships"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = messages.partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can send messages in their active partnerships"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- RLS Policies for shared milestones
CREATE POLICY "Users can view milestones in their partnerships"
  ON shared_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = shared_milestones.partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can create milestones in their active partnerships"
  ON shared_milestones FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can update milestones in their partnerships"
  ON shared_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = shared_milestones.partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

-- RLS Policies for video sessions
CREATE POLICY "Users can view sessions in their partnerships"
  ON video_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = video_sessions.partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can create sessions in their active partnerships"
  ON video_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

CREATE POLICY "Users can update sessions in their partnerships"
  ON video_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = video_sessions.partnership_id
      AND (partnerships.requester_id = auth.uid() OR partnerships.receiver_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_shared_milestones_updated_at
  BEFORE UPDATE ON shared_milestones
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE partnerships;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE video_sessions;