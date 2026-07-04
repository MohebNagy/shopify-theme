class Slider {
  constructor(container, options = {}) {
    this.container = container;
    this.track = container.querySelector(".slider-track");
    this.slides = container.querySelectorAll(".slide");

    if (!this.track || !this.slides.length) return;

    this.index = 0;
    this.autoplay = options.autoplay || false;
    this.interval = options.interval || 4000;

    this.init();
  }

  init() {
    this.update();

    if (this.autoplay) {
      setInterval(() => this.next(), this.interval);
    }
  }

  next() {
    this.index = (this.index + 1) % this.slides.length;
    this.update();
  }

  prev() {
    this.index = (this.index - 1 + this.slides.length) % this.slides.length;
    this.update();
  }

  update() {
    const offset = this.index * -100;
    this.track.style.transform = `translateX(${offset}%)`;
  }
}

document.querySelectorAll(".slider").forEach(slider => {
  new Slider(slider, { autoplay: true });
});
