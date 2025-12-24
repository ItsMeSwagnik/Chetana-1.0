# Firestore Buffer Overflow Troubleshooting

## Issue Description
You're experiencing Firebase Firestore buffer overflow errors with the message:
```
FIRESTORE (12.6.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)
RangeError [ERR_BUFFER_OUT_OF_BOUNDS]: "length" is outside of buffer bounds
```

## Root Cause
This error occurs when:
1. Message content is too large for the protobuf buffer (>10KB)
2. Special characters cause encoding issues in the protobuf serialization
3. Firebase SDK version compatibility issues with Node.js

## Solutions Applied

### 1. Message Length Validation
- Added 10KB limit on messages before saving to Firestore
- Messages exceeding limit are automatically truncated
- Truncation is logged for debugging

### 2. Character Sanitization
- Removes control characters that can cause encoding issues
- Strips invalid Unicode characters
- Removes unpaired surrogate characters

### 3. Automatic Error Recovery
- Tracks Firestore errors and temporarily disables it after 5 consecutive errors
- Re-enables Firestore after 5 minutes of error-free operation
- Prevents application crashes due to repeated Firestore failures

### 4. Manual Firestore Disable Option
Add to your `.env` file:
```
DISABLE_FIRESTORE=true
```

## Monitoring
The application now logs:
- Message truncation warnings
- Firestore error counts
- Automatic disable/enable events
- Buffer overflow detection

## Alternative Solutions

### Option 1: Downgrade Firebase SDK
```bash
npm install firebase@11.0.0
```

### Option 2: Use Alternative Storage
Consider switching to PostgreSQL for chat history:
```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  role VARCHAR(20),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Option 3: Increase Node.js Buffer Size
Add to your start script:
```bash
node --max-old-space-size=4096 server.js
```

## Testing
1. Send long messages (>10KB) to verify truncation
2. Send messages with special characters
3. Monitor console for Firestore status messages
4. Check that chat functionality continues even if Firestore fails

## Recovery
If Firestore is temporarily disabled:
1. Wait 5 minutes for automatic recovery
2. Or restart the server
3. Or set `DISABLE_FIRESTORE=false` and restart

The application will continue to function normally even without Firestore, as chat history is optional functionality.