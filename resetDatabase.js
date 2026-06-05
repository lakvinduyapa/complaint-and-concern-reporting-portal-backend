require("dotenv").config();

const pool = require("./config/db");

const resetDatabase = async () => {
  try {
    console.log("Resetting database...");

    await pool.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'officer',
        department VARCHAR(255) DEFAULT 'Internal Audit Unit',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE complaints (
        id SERIAL PRIMARY KEY,
        crn VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(255) NOT NULL,
        reporter_full_name VARCHAR(255),
        incident_date TIMESTAMP,
        incident_end_date TIMESTAMP,
        incident_location VARCHAR(255),
        frequency VARCHAR(100),
        awareness_method VARCHAR(255),
        description TEXT NOT NULL,
        previously_reported BOOLEAN DEFAULT FALSE,
        previous_reported_to VARCHAR(255),
        previous_report_outcome TEXT,
        current_status VARCHAR(100) DEFAULT 'Submitted',
        escalation_required BOOLEAN DEFAULT FALSE,
        ciaboc_escalation BOOLEAN DEFAULT FALSE,
        escalation_reason TEXT,
        escalation_date TIMESTAMP,
        escalation_approved_by VARCHAR(255),
        evidence_count INTEGER DEFAULT 0,
        has_evidence BOOLEAN DEFAULT FALSE,
        is_anonymous BOOLEAN DEFAULT FALSE,
        submission_source VARCHAR(100) DEFAULT 'web',
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        investigation_start_date TIMESTAMP,
        expected_completion_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE reporters (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        submission_type VARCHAR(50),
        reporter_category VARCHAR(100),
        full_name VARCHAR(255),
        employee_id VARCHAR(100),
        department VARCHAR(255),
        designation VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        preferred_contact_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE complaint_subjects (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        organisation VARCHAR(255),
        relationship VARCHAR(255),
        senior_management_involved BOOLEAN DEFAULT FALSE,
        senior_management_person_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE complaint_status_history (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        status VARCHAR(100) NOT NULL,
        note TEXT,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE complaint_investigation_notes (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_confidential BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE evidence (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        evidence_type VARCHAR(100) NOT NULL,
        original_file_name VARCHAR(255) NOT NULL,
        stored_file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by VARCHAR(255) DEFAULT 'Public User',
        is_confidential BOOLEAN DEFAULT TRUE,
        verification_status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE audit_logs (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(100),
        user_agent TEXT,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_complaints_status ON complaints(current_status);
      CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
      CREATE INDEX idx_complaints_created_at ON complaints(created_at);
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_complaint_id ON audit_logs(complaint_id);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_performed_at ON audit_logs(performed_at);
    `);

    console.log("Database reset successfully.");
    console.log("All tables created successfully.");
    console.log("Audit Logs table created successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Database reset failed:", error.message);
    process.exit(1);
  }
};

resetDatabase();