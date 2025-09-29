const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');

class ArgoCsvProcessor {
  constructor() {
    this.prisma = new PrismaClient();
    this.dataPath = process.env.CSV_PATH || path.resolve(process.cwd(), '../../Data/2020/11/csv');
  }

  async processAllFiles() {
    const files = fs.readdirSync(this.dataPath)
      .filter(file => file.endsWith('_prof.csv'))
      .sort();
    console.log(`Processing ${files.length} CSV files from November 2020...`);
    
    // Extract float metadata from all files first
    const floatMetadata = await this.extractFloatMetadata(files);
    console.log(`Found ${Object.keys(floatMetadata).length} unique floats`);
    
    // Process each file
    for (const file of files) {
      const filePath = path.join(this.dataPath, file);
      console.log(`Processing: ${file}`);
      await this.processCsvFile(filePath, floatMetadata);
    }
  }

  async extractFloatMetadata(files) {
    const floatData = {};
    
    for (const file of files) {
      const filePath = path.join(this.dataPath, file);
      const date = this.extractDateFromFilename(file);
      
      try {
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(csvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        // Group by profile to extract float positions
        const profiles = this.groupByProfile(parsed.data);
        
        for (const [profileId, profileData] of Object.entries(profiles)) {
          const sample = profileData[0];
          const lat = sample.LATITUDE || sample.latitude;
          const lon = sample.LONGITUDE || sample.longitude;
          const floatId = sample.PLATFORM_NUMBER || sample.platform_number || sample.FLOAT_ID || sample.float_id || profileId;
          
          if (lat && lon && this.isValidCoordinate(lat) && this.isValidCoordinate(lon)) {
            if (!floatData[floatId]) {
              floatData[floatId] = {
                float_id: String(floatId),
                wmo_number: String(floatId),
                positions: [],
                profiles: [],
                status: 'active'
              };
            }
            
            floatData[floatId].positions.push({
              date: date,
              latitude: Number(lat),
              longitude: Number(lon)
            });
            
            floatData[floatId].profiles.push({
              date: date,
              profile_id: profileId,
              latitude: Number(lat),
              longitude: Number(lon),
              cycle_number: sample.CYCLE_NUMBER || sample.cycle_number || 0
            });
          }
        }
      } catch (error) {
        console.warn(`Error extracting metadata from ${file}:`, error.message);
      }
    }
    
    return floatData;
  }

  extractDateFromFilename(filename) {
    const match = filename.match(/(\d{8})_prof\.csv/);
    if (match) {
      const dateStr = match[1];
      return new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`);
    }
    return new Date('2020-11-01');
  }

  groupByProfile(data) {
    const groups = {};
    for (const row of data) {
      const profileId = row.PROFILE || row.profile || 0;
      if (!groups[profileId]) {
        groups[profileId] = [];
      }
      groups[profileId].push(row);
    }
    return groups;
  }

  async processCsvFile(filePath, floatMetadata) {
    try {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';']
      });
      if (parsed.errors.length > 0) {
        console.warn(`CSV parsing warnings for ${filePath}:`, parsed.errors);
      }
      const data = parsed.data;
      console.log(`Found ${data.length} records in ${path.basename(filePath)}`);
      
      // Group by profile and process each profile
      const profileGroups = this.groupByProfile(data);
      for (const [profileId, profileData] of Object.entries(profileGroups)) {
        await this.processProfileData(profileId, profileData, floatMetadata);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  async processProfileData(profileId, profileData, floatMetadata) {
    try {
        const sample = profileData[0];
        const floatId = sample.PLATFORM_NUMBER || sample.platform_number || sample.FLOAT_ID || sample.float_id || profileId;
        let lat = sample.LATITUDE || sample.latitude || null;
        let lon = sample.LONGITUDE || sample.longitude || null;
        const cycleNumber = sample.CYCLE_NUMBER || sample.cycle_number || 0;
        const date = this.extractDateFromFilename(path.basename(profileId));

        if ((!lat || !lon || !this.isValidCoordinate(lat) || !this.isValidCoordinate(lon)) && floatMetadata[floatId]) {
            const metadata = floatMetadata[floatId];
            const lastPosition = metadata.positions[metadata.positions.length - 1];
            if (lastPosition) {
                lat = lat || lastPosition.latitude;
                lon = lon || lastPosition.longitude;
            }
        }

        if (!lat || !lon || !this.isValidCoordinate(lat) || !this.isValidCoordinate(lon)) {
            console.warn(`Invalid coordinates for profile ${profileId}`);
            return;
        }

        // Insert/update float info
        await this.upsertFloat(String(floatId), { latitude: lat, longitude: lon });

        // Insert profile
        const profile = await this.insertProfile(String(floatId), {
            latitude: lat,
            longitude: lon,
            cycle_number: cycleNumber,
            date: date
        });

        // Insert measurements
        await this.insertMeasurements(profile.id, profileData);

    } catch (error) {
        console.error(`Error processing profile ${profileId}:`, error);
    }
  }

  async upsertFloat(floatId, position) {
    const lat = position.latitude;
    const lon = position.longitude;
    await this.prisma.argo_floats.upsert({
      where: { float_id: String(floatId) },
      update: { last_position_lat: lat, last_position_lon: lon },
      create: {
        float_id: String(floatId),
        wmo_number: String(floatId),
        last_position_lat: lat,
        last_position_lon: lon,
        deployment_date: new Date('2020-11-01'),
        status: 'active',
        platform_type: 'ARGO_FLOAT'
      }
    });
  }

  async insertProfile(floatId, profileData) {
    const profile = await this.prisma.argo_profiles.create({
      data: {
        float_id: String(floatId),
        profile_date: profileData.date,
        cycle_number: profileData.cycle_number,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        profile_direction: 'A'
      }
    });
    return profile;
  }

  async insertMeasurements(profileId, measurements) {
    const validMeasurements = [];
    for (const row of measurements) {
      const pressure = row.PRES;
      const temperature = row.TEMP;
      const salinity = row.PSAL;
      const qualityFlag = '1';
      if (this.isValidValue(pressure) && this.isValidValue(temperature)) {
        validMeasurements.push({
          profile_id: profileId,
          pressure: Number(pressure),
          temperature: Number(temperature),
          salinity: this.isValidValue(salinity) ? Number(salinity) : null,
          depth: this.pressureToDepth(Number(pressure)),
          quality_flag: String(qualityFlag).charAt(0) || '1'
        });
      }
    }
    if (validMeasurements.length > 0) {
      await this.prisma.argo_measurements.createMany({ data: validMeasurements, skipDuplicates: true });
      console.log(`Inserted ${validMeasurements.length} measurements for profile ${profileId}`);
    }
  }

  extractDate(row) {
    const dateStr = row.JULD || row.juld || row.DATE || row.date || row.REFERENCE_DATE_TIME;
    if (!dateStr) return new Date('2020-11-01');
    let date = new Date(dateStr);
    if (isNaN(date.getTime()) && typeof dateStr === 'number') {
      const argoEpoch = new Date('1950-01-01T00:00:00Z');
      date = new Date(argoEpoch.getTime() + (dateStr * 24 * 60 * 60 * 1000));
    }
    return isNaN(date.getTime()) ? new Date('2020-11-01') : date;
  }

  isValidValue(value) {
    return value !== null && value !== undefined && !isNaN(Number(value)) && Number(value) !== 99999.0 && Number(value) > -999 && value !== '';
  }

  isValidCoordinate(coord) {
    const num = Number(coord);
    return !isNaN(num) && num >= -90 && num <= 90;
  }

  pressureToDepth(pressure) {
    return pressure * 1.019716;
  }
}

const processor = new ArgoCsvProcessor();
processor.processAllFiles()
  .then(() => { console.log('CSV data processing completed successfully'); process.exit(0); })
  .catch(error => { console.error('CSV processing failed:', error); process.exit(1); });


