import { Store } from 'express-session';
import Client from '@replit/database';

export class ReplitSessionStore extends Store {
  private client: Client;
  private prefix: string;
  private ttl: number;

  constructor(options: { prefix?: string; ttl?: number } = {}) {
    super();
    this.client = new Client();
    this.prefix = options.prefix || 'sess:';
    this.ttl = options.ttl || 86400; // 24 hours in seconds
  }

  // Get session data
  get(sid: string, callback: (err: any, session?: any) => void): void {
    const key = this.prefix + sid;
    
    this.client.get(key)
      .then((result: any) => {

        if (result !== null && result !== undefined) {
          try {
            let sessionData;
            
            // Handle Replit Database response format
            if (typeof result === 'object' && result.ok && result.value) {
              // Replit Database returns { ok: true, value: "..." }
              sessionData = JSON.parse(result.value);
            } else if (typeof result === 'string') {
              sessionData = JSON.parse(result);
            } else if (typeof result === 'object') {
              sessionData = result;
            } else {
              console.error('Unexpected result type:', typeof result, result);
              return callback(null, null);
            }
            
            // Check if session has expired (manual TTL)
            if (sessionData._expires && Date.now() > sessionData._expires) {
              this.destroy(sid, () => {});
              return callback(null, null);
            }
            
            // Remove internal expiry field before returning
            const { _expires, ...session } = sessionData;
            callback(null, session);
          } catch (err) {
            console.error('Session parse error:', err);
            callback(err);
          }
        } else {
          callback(null, null);
        }
      })
      .catch(err => {
        console.error('Session get error:', err);
        callback(err);
      });
  }

  // Set session data
  set(sid: string, session: any, callback: (err?: any) => void): void {
    const key = this.prefix + sid;
    
    try {
      // Add expiry timestamp
      const sessionWithExpiry = {
        ...session,
        _expires: Date.now() + (this.ttl * 1000)
      };
      
      const value = JSON.stringify(sessionWithExpiry);
      
      this.client.set(key, value)
        .then(() => callback())
        .catch(err => {
          console.error('Session set error:', err);
          callback(err);
        });
    } catch (err) {
      console.error('Session stringify error:', err);
      callback(err);
    }
  }

  // Destroy session
  destroy(sid: string, callback: (err?: any) => void): void {
    const key = this.prefix + sid;
    
    this.client.delete(key)
      .then(() => callback())
      .catch(err => {
        console.error('Session destroy error:', err);
        callback(err);
      });
  }

  // Touch session (update expiry)
  touch(sid: string, session: any, callback: (err?: any) => void): void {
    // Re-set the session to update expiry
    this.set(sid, session, callback);
  }

  // Optional: Clean up expired sessions
  async cleanupExpired(): Promise<void> {
    try {
      const keys = await this.client.list(this.prefix);
      const now = Date.now();
      
      if (Array.isArray(keys)) {
        for (const key of keys) {
          const result = await this.client.get(key);
          if (result !== null && result !== undefined) {
            try {
              let session;
              
              // Handle Replit Database response format
              if (typeof result === 'object' && result.ok && result.value) {
                // Replit Database returns { ok: true, value: "..." }
                session = JSON.parse(result.value);
              } else if (typeof result === 'string') {
                session = JSON.parse(result);
              } else if (typeof result === 'object') {
                session = result;
              } else {
                // Invalid session data, delete it
                await this.client.delete(key);
                continue;
              }
              
              if (session._expires && now > session._expires) {
                await this.client.delete(key);
              }
            } catch (err) {
              // Invalid session data, delete it
              await this.client.delete(key);
            }
          }
        }
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
}