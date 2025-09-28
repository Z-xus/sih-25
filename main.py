import netCDF4

# Load the NetCDF file
ds = netCDF4.Dataset("./Data/2020/11/20201122_prof.nc")

# Extract latitude and longitude arrays
latitudes = ds.variables["LATITUDE"][:]
longitudes = ds.variables["LONGITUDE"][:]

# For the first profile (as example)
lat = latitudes[0]
lon = longitudes[0]
print(f"Profile 0 location: lat={lat}, lon={lon}")
