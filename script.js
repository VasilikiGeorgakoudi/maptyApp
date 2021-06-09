'use strict';

class Workout {

  clicks = 0;

  constructor(coords, distance, duration, date, id, icon, temp, city) {

    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.date = date;
    this.id = id;
    this.icon = icon;
    this.temp = temp;
    this.city = city;

  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`

  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, date, id, icon, temp, city, cadence) {
    super(coords, distance, duration, date, id, icon, temp, city);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, date, id, icon, temp, city, elevationGain) {
    super(coords, distance, duration, date, id, icon, temp, city);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);







///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerSidebar = document.querySelector('.sidebar');
const workoutsContainer = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workoutList = document.querySelector('.workout-list');




class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #currentPosition;
  #workouts = [];
  #curWorkout;
  #curWorkoutEl
  #editForm = false;
  #sort = false;
  #markers = [];

  constructor() {
    // Get user's position
    this._loadMap();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._submitForm.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerSidebar.addEventListener('click', this._clickHandler.bind(this));
    // containerSidebar.addEventListener('load', this._whereAmI());
  }

  _getPosition() {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject);

    })
    
  }

  async _loadMap() {

    try {
      //geolocation 
      const position = await this._getPosition();
      const { latitude } = position.coords;
      const { longitude } = position.coords;


      const coords = [latitude, longitude];
      this.#currentPosition = coords;


      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);


      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);


      // Handling clicks on map
      this.#map.on('click', this._showForm.bind(this));

      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });
      this._renderUserPositionMarker(coords);
    } catch (err) {
      console.error(err);

      //Reject promise returned from async function
      throw err; //reThrow the error again so we can propagate it down  
    }

  }

  _showForm(mapE, work) {
    this.#mapEvent = mapE;
    if ((form.classList.contains = 'hidden')) form.classList.remove('hidden');
    inputDistance.focus();

    inputDistance.focus();
    if (work) {
      inputDistance.value = work.distance;
      inputDuration.value = work.duration;
      if (work.type === 'running') {
        inputType.value = 'running';
        inputCadence.closest('.form__row').classList.remove('form__row--hidden');
        inputElevation.closest('.form__row').classList.add('form__row--hidden')

        inputCadence.value = work.cadence;
      }
      else {
        inputType.value = 'cycling';
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
        inputElevation.closest('.form__row').classList.remove('form__row--hidden');
        inputElevation.value = work.elevationGain;
      }


    }
  }


  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _submitForm(e) {
    if (this.#editForm) {
      this._changeWorkout(this.#curWorkout, e);

    } else {
      this._newWorkout(e);
    }
  }
  _changeWorkout(curWorkout, e) {
    e.preventDefault();
    // console.log(curWorkout);
    const [lat, lng] = curWorkout.coords;
    const date = curWorkout.date;
    const id = curWorkout.id;
    const icon = curWorkout.icon;
    const city = curWorkout.city;
    const temp = curWorkout.temp;
    let type = curWorkout.type;
    this.#curWorkoutEl.classList.remove(`edit--${type}`);
    // console.log(lat, lng);
    //delete the item from workouts Array 
    this.#workouts = this.#workouts.filter(work => work.id !== curWorkout.id);

    let workout;



    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
      // [curWorkout.distance, curWorkout.duration, curWorkout.cadence] = [distance, duration, cadence];
      workout = new Running([lat, lng], distance, duration, date, id, icon, temp, city, cadence);



    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      // [curWorkout.distance, curWorkout.duration, curWorkout.elevation] = [distance, duration, elevation];
      workout = new Cycling([lat, lng], distance, duration, date, id, icon, temp, city, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);
    this._renderWorkout(curWorkout, workout);
    this._renderWorkoutMarker(workout);
    this._hideForm();

    this.#editForm = false;
    this._setLocalStorage();






  }

  async _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    const date = new Date();
    const id = (Date.now() + '').slice(-10);
    try {

      const [[temp, icon], city] = await Promise.all([
        this._getWeather(lat, lng),
        this._whereAmI(lat, lng)
      ]);
      if (!temp || !icon) throw new Error('Problem with Weather api');
      if (!city) throw new Error('Problem with location api');

      // If workout running, create running object
      if (type === 'running') {
        const cadence = +inputCadence.value;

        // Check if data is valid
        if (
          // !Number.isFinite(distance) ||
          // !Number.isFinite(duration) ||
          // !Number.isFinite(cadence)
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        )
          return alert('Inputs have to be positive numbers!');

        workout = new Running([lat, lng], distance, duration, date, id, icon, temp, city, cadence);
      }

      // If workout cycling, create cycling object
      if (type === 'cycling') {
        const elevation = +inputElevation.value;

        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)
        )
          return alert('Inputs have to be positive numbers!');

        workout = new Cycling([lat, lng], distance, duration, date, id, icon, temp, city, elevation);
      }

      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(_, workout);

      // Hide form + clear input fields
      this._hideForm();

      // Set local storage to all workouts
      this._setLocalStorage();
    }
    catch (err) {
      this._renderError(err);

    }
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.description}`
      )
      .openPopup();
    // save marker in Object
    this.#markers.push(marker);
    workout.markerId = marker._leaflet_id;
  }
  _renderUserPositionMarker(coords) {
    const marker = L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,

        })
      )
      .setPopupContent(
        `Your current position`
      )
      .openPopup();


  }


  _renderWorkout(curWorkout, workout) {
    const curWorkoutEl = document.querySelector(`[data-id="${curWorkout.id}"]`);
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        
        <span class="workout__options"><a class="edit-button" data-type="edit">Edit</a> <a class="delete-button" data-type="delete">Delete</a></span>
        
        <div class="workout__details">
          <span class="workout__icon">🚩</span>
          <span class="workout__value">${workout.city}</span>
          
        </div>
        <div class="workout__details">
          <span class="workout__icon">🌡</span>
          <span class="workout__value">${workout.temp}C</span>
          <span class="weather-icon"> <img src="${workout.icon}"></span>
  
        </div>
        
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
  
        </div>
        
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">💚</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    if (this.#editForm) {
      curWorkoutEl.outerHTML = html;
    } else {

      workoutList.insertAdjacentHTML('afterbegin', html);
    }

  }




  _clickHandler(e) {


    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    // const workoutEl = e.target.closest('.workout');

    // if (!workoutEl) return;

    // const workout = this.#workouts.find(
    //   work => work.id === workoutEl.dataset.id
    // );

    // this.#map.setView(workout.coords, this.#mapZoomLevel, {
    //   animate: true,
    //   pan: {
    //     duration: 1,
    //   },
    // });
    //προσδιοριζουμε που ήταν το κλικ 
    //select form
    const form = e.target.closest('.form');
    //select curent workout
    const workoutEl = e.target.closest('.workout');
    //select edit or delete button 
    const btnElement = e.target.closest('.workout__options a');
    //select reset
    const options = e.target.closest('.options a');






    if (form) return;

    if (workoutEl) {

      //find the clicked activity 
      const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
      this.#curWorkout = workout;
      this.#curWorkoutEl = workoutEl;

      if (btnElement) {
        //handle edit button 
        if (btnElement.dataset.type === 'edit') {
          this._editWorkout(workout, workoutEl);


        } else {
          //handle delete button
          console.log(btnElement);
          this._deleteItem(workout, workoutEl);
        }
      } else {
        // setView is a leaflet library method 
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
          animate: true,
          pan: {
            duration: 1
          }

        });

      }

    }
    if (options) {
      if (options.classList.contains('reset-button')) {
        this._reset();
      } else if (options.classList.contains('sort-button')) {

        this._sortByDistance(this.#sort);
        this.#sort = !this.#sort;

      } else {
        this.#map.setView(this.#currentPosition, this.#mapZoomLevel, {
          animate: true,
          pan: {
            duration: 1
          }
        });

      }

    }


  }







  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;


    let workout;
    data.forEach(work => {
      workout = work.type === 'running' ? new Running(work.coords, work.distance, work.duration, new Date(work.date), work.id, work.icon, work.temp, work.city, work.cadence) : new Cycling(work.coords, work.distance, work.duration, new Date(work.date), work.id, work.icon, work.temp, work.city, work.elevationGain)
      this.#workouts.push(workout);
    })
    console.log(this.#workouts)

    this.#workouts.forEach(work => {
      this._renderWorkout(_, work);
    });


  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  _editWorkout(workout, workoutEl) {

    this.#editForm = true;

    workoutEl.classList.add(`edit--${workout.type}`);
    this._showForm(_, workout);



  }
  _deleteItem(workout, workoutEl) {
    workoutEl.classList.add('hidden');
    // this._deleteWorkoutMarker(workout);


    this.#workouts = this.#workouts.filter(value => value.id !== workout.id);
    const marker = this.#markers.find(
      mark => mark._leaflet_id === workout.markerId
    );
    // console.log(marker)
    marker.remove();

    this._setLocalStorage();

  }
  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  _sortByDistance(sort) {

    if (this.#workouts.length === 0) return;

    const workouts = !sort ? this.#workouts.slice().sort(function (a, b) {
      return a.distance - b.distance
    }) : this.#workouts;

    workoutList.innerHTML = "";
    console.log(workoutList)
    workouts.forEach(work => {
      this._renderWorkout(_, work);
    });

  }
  _getCurPosition() {
    return new Promise(function (resolve, reject) {
      // navigator.geolocation.getCurrentPosition(position => resolve(position), err => reject(err));
      navigator.geolocation.getCurrentPosition(resolve,
        reject); // this function automaticaly calls these callbacks and automaticly passes the position


    })
  }
  async _whereAmI(lat, lng) {

    try {
      //Geolocation 
      // const [lat, lng] = workout.coords;

      //Reverse geocoding
      const resGeo = await fetch(`https://geocode.xyz/${lat},${lng}?geoit=json`);

      const dataGeo = await resGeo.json();
      // console.log(dataGeo);
      if (!resGeo.ok) throw new Error('Please try to reload the page again. Unfortunately, this api what I am using now can not read all datas at once and I am not willing to pay for the API. Error occurs from this reason.')

     
      return [dataGeo.city];

    } catch (err) {
      console.error(err);

      //Reject promise returned from async function
      throw err; //reThrow the error again so we can propagate it down  

    }

  }
  async _getWeather(lat, lng) {
    const access_key = "c1a4e6cc6ce36a454e3144d54ebd8d7a";
    const resWeather = await fetch(`http://api.weatherstack.com/current?access_key=${access_key}&query=${lat},-${lng}`);

    if (!resWeather.ok) return;

    const data = await resWeather.json();
 
    const icon = data.current.weather_icons[0];
    const temp = data.current.temperature;

   
    return [temp, icon];

  }
  _renderError(err) {
    alert(`Problem with:${err}. Try again`);
  }

}


const app = new App();
