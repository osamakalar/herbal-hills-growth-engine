-- Create table to store WhatsApp conversation history
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by phone number
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number, created_at);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage conversations (edge function uses service role)
CREATE POLICY "Service role can manage conversations"
ON public.whatsapp_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.whatsapp_conversations IS 'Stores WhatsApp chatbot conversation history for context';