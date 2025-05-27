-- Gallery Sessions Table
CREATE TABLE IF NOT EXISTS gallery_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'active', 'completed', 'expired')),
  query TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT NOT NULL,
  trip_id TEXT,
  expires_at INTEGER NOT NULL,
  image_count INTEGER NOT NULL DEFAULT 0
);

-- Gallery Images Table
CREATE TABLE IF NOT EXISTS gallery_images (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  index INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  attribution TEXT,
  FOREIGN KEY (gallery_id) REFERENCES gallery_sessions(id) ON DELETE CASCADE
);

-- Image Selections Table
CREATE TABLE IF NOT EXISTS image_selections (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT 0,
  selected_at INTEGER NOT NULL,
  r2_path TEXT,
  r2_url TEXT,
  FOREIGN KEY (gallery_id) REFERENCES gallery_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gallery_sessions_status ON gallery_sessions(status);
CREATE INDEX IF NOT EXISTS idx_gallery_sessions_entity ON gallery_sessions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sessions_trip ON gallery_sessions(trip_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery ON gallery_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_image_selections_gallery ON image_selections(gallery_id);
CREATE INDEX IF NOT EXISTS idx_image_selections_image ON image_selections(image_id);
