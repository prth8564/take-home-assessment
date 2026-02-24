import express from 'express';
import { Pool } from 'pg';
import { validate as isUuid } from 'uuid';
import 'dotenv/config'

const app = express();
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
});

app.get('/users/:userId/insurances', async (req, res) => {
  let userId = req.params.userId;
  userId = userId && userId.trim();

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  try {
    const result = await pool.query(
      `
        select
          u.id as user_id,
          u.first_name,
          u.last_name,
          i.id as insurance_id,
          i.policy_name,
          i.parent_insurance_id,
          p.policy_name as parent_policy_name
        from users u
        left join insurance i
          on i.user_id = u.id
        left join insurance p
          on p.id = i.parent_insurance_id
        where u.id = $1
        order by i.id
      `,
      [userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { first_name, last_name } = result.rows[0];

    const insurances = result.rows
      .filter(r => r.insurance_id) 
      .map(r => ({
        id: r.insurance_id,
        policyName: r.policy_name,
        parentInsuranceId: r.parent_insurance_id,
        parentPolicyName: r.parent_policy_name,
      }));

    res.json({
      userId,
      firstName: first_name,
      lastName: last_name,
      insurances,
    });
  } catch (err) {
    console.error('failed to fetch insurances', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.listen(process.env.PORT, () => {
  console.log('server running on port 3000');
});