import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

// Error tracking for automatic Firestore disabling
let firestoreErrorCount = 0;
let firestoreDisabled = false;
const MAX_ERRORS = 5;
const ERROR_RESET_TIME = 300000; // 5 minutes

// Reset error count after some time
setInterval(() => {
  if (firestoreErrorCount > 0) {
    firestoreErrorCount = Math.max(0, firestoreErrorCount - 1);
    if (firestoreErrorCount === 0 && firestoreDisabled) {
      firestoreDisabled = false;
      console.log('🔥 Firestore re-enabled after error recovery period');
    }
  }
}, ERROR_RESET_TIME);

function handleFirestoreError(error, operation) {
  firestoreErrorCount++;
  console.error(`❌ Firestore ${operation} error (${firestoreErrorCount}/${MAX_ERRORS}):`, error.message || error);
  
  // Check for specific buffer overflow errors - these should trigger immediate temporary disable
  const isBufferError = error.message && (
    error.message.includes('FIRESTORE') || 
    error.message.includes('buffer') || 
    error.message.includes('protobuf') ||
    error.message.includes('ERR_BUFFER_OUT_OF_BOUNDS') ||
    error.message.includes('INTERNAL ASSERTION FAILED')
  );
  
  if (isBufferError) {
    console.error('🔥 Detected Firestore buffer/protobuf error - temporarily disabling Firestore');
    firestoreDisabled = true;
    firestoreErrorCount = MAX_ERRORS; // Force disable
    
    // Auto-recovery after 2 minutes for buffer errors
    setTimeout(() => {
      firestoreDisabled = false;
      firestoreErrorCount = 0;
      console.log('🔥 Firestore re-enabled after buffer error recovery period');
    }, 120000); // 2 minutes
  } else if (firestoreErrorCount >= MAX_ERRORS) {
    firestoreDisabled = true;
    console.error('🚨 Firestore temporarily disabled due to repeated errors');
  }
}

export async function saveMessage(userId, role, message) {
  if (!db || firestoreDisabled) {
    if (firestoreDisabled) {
      console.log('🔥 Firestore temporarily disabled, skipping message save');
    } else {
      console.log('🔥 Firestore not available, skipping message save');
    }
    return;
  }
  
  try {
    // More aggressive message size limits to prevent buffer overflow
    const maxMessageLength = 5000; // Reduced to 5KB to be safe
    const maxTotalSize = 8000; // Total document size limit
    let processedMessage = message;
    
    // Convert to string if not already
    if (typeof processedMessage !== 'string') {
      processedMessage = String(processedMessage);
    }
    
    // Truncate if too long
    if (processedMessage.length > maxMessageLength) {
      processedMessage = processedMessage.substring(0, maxMessageLength) + '... [truncated]';
      console.warn(`📏 Message truncated from ${message.length} to ${maxMessageLength} characters`);
    }
    
    // Aggressive sanitization to prevent encoding issues
    processedMessage = processedMessage
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\uFFFE\uFFFF]/g, '') // Remove invalid Unicode characters
      .replace(/[\uD800-\uDFFF]/g, '') // Remove unpaired surrogate characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove additional control chars
      .trim();
    
    // Additional validation
    if (!processedMessage || processedMessage.length === 0) {
      console.warn('⚠️ Empty message after processing, skipping save');
      return;
    }
    
    // Create document data with size check
    const docData = {
      userId: String(userId).substring(0, 100), // Limit userId length
      role: String(role).substring(0, 20), // Limit role length
      message: processedMessage,
      timestamp: serverTimestamp(),
    };
    
    // Estimate document size (rough calculation)
    const estimatedSize = JSON.stringify(docData).length;
    if (estimatedSize > maxTotalSize) {
      // Further truncate message if total size is too large
      const reduction = estimatedSize - maxTotalSize + 100; // Add buffer
      processedMessage = processedMessage.substring(0, processedMessage.length - reduction) + '... [size-limited]';
      docData.message = processedMessage;
      console.warn(`📏 Document size reduced from ~${estimatedSize} to fit limits`);
    }
    
    await addDoc(collection(db, "chats"), docData);
    
    // Reset error count on successful operation
    if (firestoreErrorCount > 0) {
      firestoreErrorCount = Math.max(0, firestoreErrorCount - 1);
    }
    
    console.log('💾 Message saved to Firestore');
  } catch (error) {
    handleFirestoreError(error, 'save');
    // Don't throw error to prevent chat from breaking
    return;
  }
}

export async function getChatHistory(userId) {
  if (!db || firestoreDisabled) {
    if (firestoreDisabled) {
      console.log('🔥 Firestore temporarily disabled, returning empty history');
    } else {
      console.log('🔥 Firestore not available, returning empty history');
    }
    return [];
  }
  
  try {
    const q = query(
      collection(db, "chats"),
      where("userId", "==", String(userId)),
      orderBy("timestamp")
    );

    const snapshot = await getDocs(q);
    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure message is properly formatted
      if (data.message && typeof data.message !== 'string') {
        data.message = String(data.message);
      }
      return data;
    });
    
    // Reset error count on successful operation
    if (firestoreErrorCount > 0) {
      firestoreErrorCount = Math.max(0, firestoreErrorCount - 1);
    }
    
    return history;
  } catch (error) {
    handleFirestoreError(error, 'fetch');
    return [];
  }
}