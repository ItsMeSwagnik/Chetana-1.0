import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function queryWithRetry(query, params = [], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(query, params);
      client.release();
      return result;
    } catch (err) {
      if (client) client.release(true);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      throw err;
    }
  }
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      const userId = req.query.userId || req.url.split('/').pop();
      
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ success: false, error: 'Invalid user ID' });
      }
      
      const userIdNum = parseInt(userId);
      
      const checkResult = await queryWithRetry('SELECT id FROM users WHERE id = $1', [userIdNum]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const result = await queryWithRetry('DELETE FROM users WHERE id = $1', [userIdNum]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'User not found or already deleted' });
      }
      
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete user: ' + err.message });
    }
  } else if (req.method === 'GET') {
    try {
      const usersResult = await queryWithRetry(`
        SELECT u.id, u.name, u.email, 
               TO_CHAR(u.dob, 'YYYY-MM-DD') as dob, 
               u.created_at, COUNT(a.id) as assessment_count,
               MAX(a.assessment_date) as last_assessment
        FROM users u 
        LEFT JOIN assessments a ON u.id = a.user_id 
        WHERE (u.isadmin IS NULL OR u.isadmin = false)
        GROUP BY u.id, u.name, u.email, u.dob, u.created_at
        ORDER BY u.created_at DESC
      `);
      
      const totalAssessments = await queryWithRetry('SELECT COUNT(*) as total FROM assessments');
      const assessmentCount = parseInt(totalAssessments.rows[0].total) || 0;
      
      res.json({ 
        users: usersResult.rows,
        totalUsers: usersResult.rows.length,
        totalAssessments: assessmentCount
      });
    } catch (err) {
      console.error('Admin users fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch admin data: ' + err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}