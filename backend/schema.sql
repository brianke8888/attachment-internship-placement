-- ============================================================
-- Attachment & Internship Placement System
-- MySQL Schema (DDL only)
--
-- For local MySQL:
--   mysql -u root -p < schema.sql
--
-- For PlanetScale:
--   Connect via PlanetScale shell or dashboard and run
--   the CREATE TABLE statements below.
-- ============================================================

-- ----------------------------
-- Users (all roles)
-- ----------------------------
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  password            VARCHAR(255) NOT NULL,
  role                ENUM('student','company','admin') NOT NULL DEFAULT 'student',
  reset_token         VARCHAR(255) DEFAULT NULL,
  reset_token_expires DATETIME DEFAULT NULL,
  is_active           TINYINT(1) DEFAULT 1,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------
-- Student profiles
-- ----------------------------
CREATE TABLE student_profiles (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL UNIQUE,
  course           VARCHAR(255) DEFAULT '',
  skills           TEXT,
  phone            VARCHAR(50) DEFAULT '',
  bio              TEXT,
  cv_file_name     VARCHAR(255),
  profile_complete TINYINT(1) DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------
-- Company profiles
-- ----------------------------
CREATE TABLE company_profiles (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL UNIQUE,
  company_name     VARCHAR(255) DEFAULT '',
  industry         VARCHAR(255) DEFAULT '',
  description      TEXT,
  website          VARCHAR(255) DEFAULT '',
  location         VARCHAR(255) DEFAULT '',
  profile_complete TINYINT(1) DEFAULT 0,
  status           ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------
-- Internships
-- ----------------------------
CREATE TABLE internships (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  company_id   INT NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  requirements TEXT,
  location     VARCHAR(255) DEFAULT '',
  duration     VARCHAR(100) DEFAULT '',
  category     VARCHAR(100) DEFAULT 'General',
  deadline     DATE,
  status       ENUM('open','closed') DEFAULT 'open',
  is_approved  TINYINT(1) DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_internship_company FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------
-- Applications
-- ----------------------------
CREATE TABLE applications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  internship_id INT NOT NULL,
  cover_letter  TEXT,
  status        ENUM('pending','reviewed','shortlisted','rejected','accepted') DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_application (student_id, internship_id),
  CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_internship FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------
-- Notifications
-- ----------------------------
CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(50) DEFAULT 'info',
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  link       VARCHAR(255) DEFAULT '',
  is_read    TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- Done. Now run:  npm run seed