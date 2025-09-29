# agro_explorer.py
import os
import numpy as np
import pandas as pd
import xarray as xr
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import datetime

# ------------------- CONFIG -------------------
DATA_DIR = "./Data/2020/11/"
NC_FILES = [
    os.path.join(DATA_DIR, f) for f in os.listdir(DATA_DIR) if f.endswith("_prof.nc")
]

st.set_page_config(page_title="Argo Agro Explorer", layout="wide")


def decode_char_array(char_array):
    if np.issubdtype(char_array.dtype, np.character) or np.issubdtype(
        char_array.dtype, np.str_
    ):
        return "".join(
            [c.decode("utf-8") if isinstance(c, bytes) else str(c) for c in char_array]
        ).strip()
    else:
        return str(char_array)


def julian_to_datetime(juld_input):
    """
    Convert Julian days since 1950-01-01 to datetime.
    Handles fill values (>= 999999) and 0-d scalars.
    """
    ref_date = datetime.datetime(1950, 1, 1)

    # Convert scalar to 1D array
    if np.isscalar(juld_input):
        juld_array = np.array([juld_input], dtype=float)
    else:
        juld_array = np.array(juld_input, dtype=float)

    # Replace fill values with NaN
    juld_array[juld_array >= 999999] = np.nan

    # Convert to datetime objects
    datetimes = np.array(
        [
            ref_date + datetime.timedelta(days=float(j)) if not np.isnan(j) else None
            for j in juld_array
        ]
    )

    # If input was scalar, return single value instead of array
    if np.isscalar(juld_input):
        return datetimes[0]

    return datetimes


# ------------------- LOAD DATA -------------------
@st.cache_data
def load_argo_data(files):
    profiles = []
    for f in files:
        ds = xr.open_dataset(f)
        n_prof = ds.dims["N_PROF"]
        for i in range(n_prof):
            juld = ds["JULD"][i].values
            if juld == 999999.0:
                continue
            # time = np.datetime64("1950-01-01") + np.timedelta64(int(juld), "D")
            time = ds["JULD"][i].values
            time_utc = julian_to_datetime(time)

            lat = ds["LATITUDE"][i].values
            lon = ds["LONGITUDE"][i].values

            platform = decode_char_array(ds["PLATFORM_NUMBER"][i].values)
            # platform = "".join(ds["PLATFORM_NUMBER"][i].values).strip()
            cycle = ds["CYCLE_NUMBER"][i].values
            temp = ds["TEMP"][i, :].values
            pres = ds["PRES"][i, :].values
            psal = ds["PSAL"][i, :].values
            profiles.append(
                {
                    "platform": platform,
                    "cycle": cycle,
                    "time_utc": time_utc,
                    "lat": float(lat) if lat != 99999.0 else np.nan,
                    "lon": float(lon) if lon != 99999.0 else np.nan,
                    "temp": temp,
                    "pres": pres,
                    "psal": psal,
                }
            )
    return pd.DataFrame(profiles)


df_profiles = load_argo_data(NC_FILES)

if df_profiles.empty:
    st.error("No valid profiles found in your NetCDF files.")
    st.stop()

# ------------------- SIDEBAR FILTERS -------------------
st.sidebar.header("Filters")
platforms = df_profiles["platform"].unique()
selected_platforms = st.sidebar.multiselect(
    "Select Float(s)", platforms, default=platforms
)

# Filter out None values
valid_times = [t for t in df_profiles["time_utc"] if isinstance(t, datetime.datetime)]

if valid_times:
    date_min = min(valid_times).date()
    date_max = max(valid_times).date()
else:
    # fallback if all times are invalid
    date_min = date_max = datetime.date.today()


# valid_times = df_profiles["time_utc"].dropna()
# date_min = valid_times.min().date()
# date_max = valid_times.max().date()

date_range = st.sidebar.date_input(
    "Select Date Range",
    value=(date_min, date_max),
    min_value=date_min,
    max_value=date_max,
)

# Filter dataframe
df_filtered = df_profiles[
    (df_profiles["platform"].isin(selected_platforms))
    & (df_profiles["time_utc"].dt.date >= date_range[0])
    & (df_profiles["time_utc"].dt.date <= date_range[1])
]

st.title("🌊 Argo Agro Float Explorer")
st.markdown(f"Showing {len(df_filtered)} profiles")

# ------------------- MAP -------------------
st.subheader("Float Locations")
fig_map = px.scatter_mapbox(
    df_filtered,
    lat="lat",
    lon="lon",
    hover_name="platform",
    hover_data={"cycle": True, "time_utc": True},
    zoom=2,
    height=400,
)
fig_map.update_layout(mapbox_style="carto-positron")
fig_map.update_layout(margin={"r": 0, "t": 0, "l": 0, "b": 0})
st.plotly_chart(fig_map, use_container_width=True)

# ------------------- PROFILE PLOTS -------------------
st.subheader("Profiles Analysis")

for platform in df_filtered["platform"].unique():
    st.markdown(f"### Float: {platform}")
    df_pf = df_filtered[df_filtered["platform"] == platform]

    for i, row in df_pf.iterrows():
        pres = row["pres"]
        temp = row["temp"]
        psal = row["psal"]

        # remove fill values
        mask_temp = temp != 99999.0
        mask_psal = psal != 99999.0
        mask_pres = pres != 99999.0

        fig = go.Figure()
        if mask_temp.any():
            fig.add_trace(
                go.Scatter(
                    x=temp[mask_temp],
                    y=pres[mask_temp],
                    mode="lines+markers",
                    name="Temperature (°C)",
                    line=dict(color="red"),
                )
            )
        if mask_psal.any():
            fig.add_trace(
                go.Scatter(
                    x=psal[mask_psal],
                    y=pres[mask_psal],
                    mode="lines+markers",
                    name="Salinity (psu)",
                    line=dict(color="blue"),
                )
            )
        fig.update_yaxes(autorange="reversed", title_text="Pressure (dbar)")
        fig.update_xaxes(title_text="Value")
        st.plotly_chart(fig, use_container_width=True)

# ------------------- SUMMARY STATS -------------------
st.subheader("Summary Statistics")
summary_stats = df_filtered[["platform", "temp", "psal", "pres"]].copy()
summary_stats["temp_mean"] = summary_stats["temp"].apply(
    lambda x: np.nanmean(x[x != 99999.0])
)
summary_stats["psal_mean"] = summary_stats["psal"].apply(
    lambda x: np.nanmean(x[x != 99999.0])
)
summary_stats["pres_mean"] = summary_stats["pres"].apply(
    lambda x: np.nanmean(x[x != 99999.0])
)

st.dataframe(summary_stats[["platform", "temp_mean", "psal_mean", "pres_mean"]])

st.markdown("✅ Fully interactive, fast, aesthetic dashboard for Argo float analysis!")
