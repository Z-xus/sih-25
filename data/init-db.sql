-- ARGO Ocean Data Database Schema
-- This script creates the necessary tables for ARGO float data

-- Create argo_floats table
CREATE TABLE IF NOT EXISTS argo_floats (
    id SERIAL PRIMARY KEY,
    float_id VARCHAR(20) UNIQUE NOT NULL,
    wmo_number VARCHAR(20) NOT NULL,
    deployment_date DATE,
    last_position_lat DECIMAL(10, 6),
    last_position_lon DECIMAL(10, 6),
    status VARCHAR(20) DEFAULT 'active',
    platform_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create argo_profiles table
CREATE TABLE IF NOT EXISTS argo_profiles (
    id SERIAL PRIMARY KEY,
    float_id VARCHAR(20) REFERENCES argo_floats(float_id),
    profile_date TIMESTAMP NOT NULL,
    cycle_number INTEGER,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    profile_direction VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create argo_measurements table
CREATE TABLE IF NOT EXISTS argo_measurements (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES argo_profiles(id),
    pressure DECIMAL(8, 2),
    temperature DECIMAL(6, 3),
    salinity DECIMAL(6, 3),
    depth DECIMAL(8, 2),
    quality_flag CHAR(1) DEFAULT '1'
);

-- Create argo_trajectories table
CREATE TABLE IF NOT EXISTS argo_trajectories (
    id SERIAL PRIMARY KEY,
    float_id VARCHAR(20) REFERENCES argo_floats(float_id),
    timestamp TIMESTAMP NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    location_quality CHAR(1)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_argo_floats_float_id ON argo_floats(float_id);
CREATE INDEX IF NOT EXISTS idx_argo_profiles_float_id ON argo_profiles(float_id);
CREATE INDEX IF NOT EXISTS idx_argo_profiles_date ON argo_profiles(profile_date);
CREATE INDEX IF NOT EXISTS idx_argo_measurements_profile_id ON argo_measurements(profile_id);
CREATE INDEX IF NOT EXISTS idx_argo_trajectories_float_id ON argo_trajectories(float_id);

-- Insert sample float data (will be populated by CSV ingestion)
INSERT INTO argo_floats (float_id, wmo_number, last_position_lat, last_position_lon, status, platform_type, deployment_date) 
VALUES 
('2901001', '2901001', 10.5, 75.2, 'active', 'ARGO_FLOAT', '2020-11-01'),
('2901002', '2901002', 12.3, 78.1, 'active', 'ARGO_FLOAT', '2020-11-01'),
('2901003', '2901003', 8.7, 72.5, 'active', 'ARGO_FLOAT', '2020-11-01'),
('2901004', '2901004', 15.2, 80.3, 'active', 'ARGO_FLOAT', '2020-11-01'),
('2901005', '2901005', 6.8, 68.9, 'active', 'ARGO_FLOAT', '2020-11-01')
ON CONFLICT (float_id) DO NOTHING;

