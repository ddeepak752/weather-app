
const API_KEY = "12e393fbd435607654590beef3863efd";

const DAYS_OF_THE_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
let selectedCityText;
let selectedCity;
const getCitiesUsingGeolocation = async (searchText) => {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`);
    return response.json();
}

const getCurrentWeatherData = async  ({lat, lon, name: city})=>{
    
    const url = lat&& lon? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    const response = await fetch(url);
    return response.json()
}

const getHourlyForecast = async({name:city})  =>{
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json()
    console.log(data)
    return data.list.map(forecast =>{
        const{main:{temp, temp_max,temp_min},dt, dt_txt,weather:[{description, icon}]} = forecast;
        return{temp,temp_max,temp_min , dt, dt_txt, description, icon}
    })
}

const formatTemperature = (temp) => `${temp?.toFixed(1)}\u00B0`
const createIconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`

loadCurrentForecast = ({name, main: {temp, temp_max, temp_min}, weather: [{description}]}) =>{
    const currentForecastElement =  document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".city").textContent = name ;
    currentForecastElement.querySelector(".temp").textContent = formatTemperature(temp);
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".min-max-temp").textContent = `H: ${formatTemperature(temp_max)} L: ${formatTemperature(temp_min)}`;
    // <h1>City name</h1>
    // <p class="temp">Temp</p>
    // <p class="description">Description</p>
    // <p class="min-max-temp">High Low</p>
}

const loadHourlyForecast = ({main: {temp: tempNow},weather: [{icon: iconNow}]},hourlyForecast) =>{
    console.log(hourlyForecast);
    const timeFormatter = Intl.DateTimeFormat("en",{
        hour12:true, hour:"numeric"
    })
    let dataFor12Hours = hourlyForecast.slice(2, 14);
    const hourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
            <h3 class="time">Now</h3>
            <img class="icon" src="${createIconUrl(iconNow)}" />
            <p class="hourly-temp">${formatTemperature(tempNow)}</p>
        </article>`;

    for(let {temp, icon, dt_txt} of dataFor12Hours){
        innerHTMLString += `<article>
            <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
            <img class="icon" src="${createIconUrl(icon)}" />
            <p class="hourly-temp">${formatTemperature(temp)}</p>
        </article>`
    }
    hourlyContainer.innerHTML = innerHTMLString;
}
const calculateDayWiseForecast = (hourlyForecast) => {
    let dayWiseForeCast = new Map();
    for(let forecast of hourlyForecast){
        const [date] = forecast.dt_txt.split(" ");
        const dayOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()]
        console.log(dayOfTheWeek);
        if(dayWiseForeCast.has(dayOfTheWeek)){
            let forecastForTheDay = dayWiseForeCast.get(dayOfTheWeek);
            forecastForTheDay.push(forecast);
            dayWiseForeCast.set(dayOfTheWeek, forecastForTheDay);
        }
        else{
            dayWiseForeCast.set(dayOfTheWeek, [forecast]);
        }
    }
    console.log(dayWiseForeCast);
    for(let [key, value] of dayWiseForeCast){
        let temp_min = Math.min(...Array.from(value, val=> val.temp_min));
        let temp_max = Math.max(...Array.from(value, val=> val.temp_max));

        dayWiseForeCast.set(key, {temp_min, temp_max, icon: value.find(v=> v.icon).icon})

    }
    console.log(dayWiseForeCast);
    return dayWiseForeCast;
}
    const loadFiveDayForecast = ( hourlyForecast)=> {
    console.log(hourlyForecast)
    const dayWiseForeCast = calculateDayWiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container")
    let dayWiseInfo = "";
    Array.from(dayWiseForeCast).map(([day, {temp_max, temp_min, icon}], index) => {

        if(index < 5){
            dayWiseInfo += `<article class="day-wise-forecast">
            <h3 class="day" >${index === 0? "today": day}</h3>
            <img class="icon" src="${createIconUrl(icon)}" alt="icon for the forecast" />
            <p class="min-temp">${formatTemperature(temp_min)}</p>
            <p class="max-temp">${formatTemperature(temp_max)}</p>
        </article>`;
        }
        
    });
    container.innerHTML = dayWiseInfo;
}

const loadFeelsLike = ({main: {feels_like}})=>{
    let container = document.querySelector("#feels-like");
    container.querySelector(".feels-like-temp").textContent = formatTemperature(feels_like);
}
const loadHumidity = ({main: {humidity}})=>{
    let container = document.querySelector("#humidity");
    container.querySelector(".humidity-value").textContent = `${humidity} %`;
}

const loadForecastUsingGeoLocation = ()=>{
    navigator.geolocation.getCurrentPosition(({coords})=>{
        const {latitude: lat, longitude:lon} = coords;
        selectedCity = {lat, lon};
        loadData();
    }, error=> console.log(error))
}

const loadData = async () => {
    const currentWeather = await getCurrentWeatherData(selectedCity);
    loadCurrentForecast(currentWeather)
    const hourlyForecast = await getHourlyForecast(currentWeather);
    loadHourlyForecast(currentWeather, hourlyForecast);
    loadFiveDayForecast(hourlyForecast);
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
}

function debounce(func){
    let timer;
    return (...args) => {
        clearTimeout(timer);//clear existing timer 
        //clear a new time till user is typing
        timer = setTimeout(() =>{
            console.log("debounce");
            func.apply(this, args)
        },  500);
    }
}

const onSearchChange = async (event) => {
    let {value} = event.target;
    if(!value){
        selectedCity = null;
        selectedCityText = "";
    }
    if(value && (selectedCityText !== value)){
        const listOfCities = await getCitiesUsingGeolocation(value);
        let options = "";
        for(let {lat, lon, name, state, country} of listOfCities){
            options += `<option data-city-details = '${JSON.stringify({lat, lon, name })}' value="${name}, ${state}, ${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options;
        console.log((listOfCities));
    }
}

const handleCitySelection = (event)=> {
    console.log("selection done");
    selectedCityText = event.target.value;
    let options = document.querySelectorAll("#cities > option");
    console.log(options);
    if(options?.length){
        let selectedOption = Array.from(options).find(opt=> opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        console.log({selectedCity});
        loadData();
    }
}

const debounceSearch = debounce((event) => onSearchChange(event))



document.addEventListener("DOMContentLoaded", async ()=>{
    loadForecastUsingGeoLocation();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", debounceSearch);
    searchInput.addEventListener("change", handleCitySelection);
    
    
})