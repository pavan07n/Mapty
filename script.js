'use strict';

class Workout {
  //Public instance fields (properties)
  id = (Date.now() + '').slice(-6);
  date = new Date();
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 
    'October', 'November', 'December'];

    // prettier-ignore
    this.dateStr = `${this.type[0].toUpperCase() + this.type.slice(1)} on
      ${this.date.getDate()} 
      ${months[this.date.getMonth()].toString().slice(0,3)}
      ${this.date.getFullYear().toString().slice(2)}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
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
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////////////
/// APLICATION ARCHITECHTURE ///

//Element selection
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// App class that handles all events
class App {
  //Private class fields (properties)
  #map;
  #mapZoomLvl = 13.5;
  #mapEvent;
  #workouts = [];

  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    // Attach 'event listeners'
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleInputType);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  //getting user position
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // CurrentPos Success callback
        this._loadMap.bind(this),

        //CurrentPos Error callback
        function () {
          alert('Unable to get position, please allow location access!');
        },

        //CurrentPos Options Object
        { enableHighAccuracy: true }
      );
    }
  }

  //Loading the Map
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // Current location Icon
    const myIcon = L.icon({
      iconUrl: 'images/location-icon2.png',
      iconSize: [32, 38], //[x,y](width,height)
      iconAnchor: [22, -10], //[22,-10] [x,y] +ve X = pull left, +ve Y = pull up
      popupAnchor: [-6, 10], //[3,11] [x,y] relative to anchor +ve X = push right +ve Y = push down
    });

    //temp Gmap link
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    //lat, long array
    const coords = [latitude, longitude];

    //display map
    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);

    //Map tile Layer & adding it to map Object
    const OpenStreetMap_Mapnik = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    );
    OpenStreetMap_Mapnik.addTo(this.#map);

    //adding current location marker
    this.curPosMarker = L.marker(coords, { opacity: 1, icon: myIcon })

      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 150,
          minWidth: 30,
          autoClose: false,
          closeOnClick: false,
        }).setContent('Current Location')
      )
      .openPopup();

    //Handling all the user clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //Rendering the workout markers of Stored workouts
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  //Show input form
  _showForm(mapE) {
    this.curPosMarker.remove();
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Hide input form
  _hideForm() {
    //prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //Switch between workout types
  _toggleInputType() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Submit a workout
  _newWorkout(e) {
    e.preventDefault();

    //helper functions
    const allNumbers = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // 1. Get input data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; //lat long coords of user click on map
    let workout;

    // 2. If workout is running, create a Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //check if data is valid
      if (
        !allNumbers(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input value should be a positive number!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // 3. If workout is cycling, create a Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      //check if data is valid
      if (
        !allNumbers(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input value should be a positive number!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // 4. Add workout object to workouts array
    this.#workouts.push(workout);

    // 5. Render workout on the map as marker
    this._renderWorkoutMarker(workout);

    // 7. Render workout in the list
    this._renderWorkoutList(workout);

    //8. Hide form
    this._hideForm();

    //9. Set the local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const workoutPopupOptions = {
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    };
    //PopUp
    const workoutPopUp = L.popup(workoutPopupOptions).setContent(
      `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.dateStr}`
    );

    //Adding a marker(dropped pin) on map wherever the user clicks
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(workoutPopUp)
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.dateStr}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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
        <span class="workout__value">${workout.pace.toFixed(2)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
     </li> 
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(2)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevGain}</span>
          <span class="workout__unit">m</span>
        </div>
     </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    // Selecting the workout obj with a specific id
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // //public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkoutList(work);
    });
  }

  //Public method of APP
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
