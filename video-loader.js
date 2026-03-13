class VideoHeroController {
  constructor(frameElement, playlist) {
    if (!(frameElement instanceof HTMLElement)) {
      throw new Error('VideoHeroController requires a valid hero video frame element.');
    }

    this.frameElement = frameElement;
    this.videoElements = Array.from(frameElement.querySelectorAll('[data-hero-video]'));
    if (this.videoElements.length < 2) {
      throw new Error('VideoHeroController requires two hero video layers.');
    }

    this.playlist = Array.isArray(playlist) && playlist.length
      ? [...playlist]
      : [
          'vid (1).mp4',
          'vid (2).mp4',
          'vid (3).mp4',
          'vid (4).mp4',
          'vid (5).mp4',
          'vid (6).mp4',
          'vid (7).mp4',
          'vid (8).mp4'
        ];

    this.activeSlot = 0;
    this.currentIndex = 0;
    this.nextIndex = this.playlist.length > 1 ? 1 : 0;
    this.currentSource = '';
    this.preloadedIndex = null;
    this.preloadedSource = '';
    this.preloadedProfile = this.getPlaybackProfile();
    this.lastProfile = this.preloadedProfile;
    this.isDestroyed = false;
    this.isTransitioning = false;
    this.shouldResumeWhenVisible = false;
    this.transitionDurationMs = 700;
    this.bufferLeadSeconds = 1.2;
    this.loadTokens = new Map();
    this.transitionTimer = null;
    this.preloadPromise = null;
    this.nextReadyPromise = null;

    this.onEnded = this.handleEnded.bind(this);
    this.onPlaying = this.handlePlaying.bind(this);
    this.onTimeUpdate = this.handleTimeUpdate.bind(this);
    this.onVisibilityChange = this.handleVisibilityChange.bind(this);
    this.onEnvironmentChange = this.handleEnvironmentChange.bind(this);

    this.setupVideos();
    this.attachEvents();
    this.loadVideo(0);
  }

  setupVideos() {
    this.videoElements.forEach((video, index) => {
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.loop = false;
      video.preload = index === this.activeSlot ? 'auto' : 'metadata';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.classList.toggle('is-active', index === this.activeSlot);
      video.classList.remove('is-incoming');
    });
  }

  attachEvents() {
    this.videoElements.forEach((video) => {
      video.addEventListener('ended', this.onEnded);
      video.addEventListener('playing', this.onPlaying);
      video.addEventListener('timeupdate', this.onTimeUpdate);
    });

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('resize', this.onEnvironmentChange, { passive: true });

    if (navigator.connection && typeof navigator.connection.addEventListener === 'function') {
      navigator.connection.addEventListener('change', this.onEnvironmentChange);
    }
  }

  normalizeIndex(index) {
    if (!this.playlist.length) return 0;
    return ((index % this.playlist.length) + this.playlist.length) % this.playlist.length;
  }

  getActiveVideo() {
    return this.videoElements[this.activeSlot];
  }

  getInactiveSlot() {
    return this.activeSlot === 0 ? 1 : 0;
  }

  getInactiveVideo() {
    return this.videoElements[this.getInactiveSlot()];
  }

  getNetworkType() {
    if (navigator.connection && navigator.connection.effectiveType) {
      return navigator.connection.effectiveType;
    }

    return '4g';
  }

  getPlaybackProfile() {
    const networkType = this.getNetworkType();
    if (networkType === '2g' || networkType === 'slow-2g') {
      return 'mobile';
    }

    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width < 768) return 'mobile';
    if (width <= 1200) return 'tablet';
    return 'desktop';
  }

  getVideoSource(videoIndex) {
    const safeIndex = this.normalizeIndex(videoIndex);
    const fileName = this.playlist[safeIndex];
    const profile = this.getPlaybackProfile();

    if (profile === 'mobile') {
      return `./videos/mobile/${fileName}`;
    }

    if (profile === 'tablet') {
      return `./videos/tablet/${fileName}`;
    }

    return `./videos/desktop/${fileName}`;
  }

  getSourceCandidates(videoIndex) {
    const safeIndex = this.normalizeIndex(videoIndex);
    const fileName = this.playlist[safeIndex];
    const profile = this.getPlaybackProfile();
    const candidates = [this.getVideoSource(safeIndex)];

    if (profile === 'mobile') {
      candidates.push(`./videos/tablet/${fileName}`);
    }

    if (profile !== 'desktop') {
      candidates.push(`./videos/desktop/${fileName}`);
    }

    candidates.push(`./videos/${fileName}`);
    return [...new Set(candidates)];
  }

  clearElementSource(element) {
    element.pause();
    element.removeAttribute('src');
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    try {
      element.load();
    } catch (err) {
      // Ignore media reset failures while tearing down.
    }
  }

  async tryLoadSource(element, src, tokenKey, token, preloadMode) {
    return new Promise((resolve) => {
      let finished = false;
      const readyEvents = preloadMode === 'metadata'
        ? ['loadedmetadata']
        : ['loadeddata', 'canplay'];
      const timeoutId = window.setTimeout(() => complete(false), preloadMode === 'metadata' ? 8000 : 15000);

      const complete = (success) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        readyEvents.forEach((eventName) => element.removeEventListener(eventName, onReady));
        element.removeEventListener('error', onError);
        resolve(success);
      };

      const onReady = () => {
        if (this.isDestroyed || this.loadTokens.get(tokenKey) !== token) {
          complete(false);
          return;
        }

        complete(true);
      };

      const onError = () => complete(false);

      readyEvents.forEach((eventName) => element.addEventListener(eventName, onReady, { once: true }));
      element.addEventListener('error', onError, { once: true });

      element.preload = preloadMode;
      element.src = src;
      try {
        element.load();
      } catch (err) {
        complete(false);
      }
    });
  }

  async loadIntoElement(element, candidates, tokenKey, preloadMode) {
    const token = (this.loadTokens.get(tokenKey) || 0) + 1;
    this.loadTokens.set(tokenKey, token);
    this.clearElementSource(element);

    for (const src of candidates) {
      const loaded = await this.tryLoadSource(element, src, tokenKey, token, preloadMode);
      if (this.isDestroyed || this.loadTokens.get(tokenKey) !== token) {
        return null;
      }

      if (loaded) {
        return src;
      }
    }

    return null;
  }

  async loadVideo(index) {
    if (this.isDestroyed || !this.playlist.length) return;

    const safeIndex = this.normalizeIndex(index);
    const activeVideo = this.getActiveVideo();
    const tokenKey = `slot-${this.activeSlot}`;
    const loadedSource = await this.loadIntoElement(activeVideo, this.getSourceCandidates(safeIndex), tokenKey, 'auto');

    if (!loadedSource || this.isDestroyed) {
      return;
    }

    this.currentIndex = safeIndex;
    this.currentSource = loadedSource;
    this.nextIndex = this.normalizeIndex(safeIndex + 1);
    this.lastProfile = this.getPlaybackProfile();
    this.preloadedIndex = null;
    this.preloadedSource = '';
    this.preloadedProfile = this.lastProfile;

    this.frameElement.classList.remove('is-transitioning');
    activeVideo.classList.add('is-active');
    activeVideo.classList.remove('is-incoming');

    this.playCurrent();
    this.preloadNext();
    this.emit('loaded', { index: this.currentIndex, src: loadedSource });
  }

  async preloadNext() {
    if (this.isDestroyed || this.playlist.length < 2 || this.isTransitioning) return;
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = (async () => {
      const targetIndex = this.nextIndex;
      const inactiveSlot = this.getInactiveSlot();
      const inactiveVideo = this.getInactiveVideo();
      const currentProfile = this.getPlaybackProfile();

      if (
        this.preloadedIndex === targetIndex &&
        this.preloadedProfile === currentProfile &&
        inactiveVideo.readyState >= HTMLMediaElement.HAVE_METADATA
      ) {
        return;
      }

      inactiveVideo.classList.remove('is-active', 'is-incoming');

      const tokenKey = `slot-${inactiveSlot}`;
      const loadedSource = await this.loadIntoElement(inactiveVideo, this.getSourceCandidates(targetIndex), tokenKey, 'metadata');

      if (!loadedSource || this.isDestroyed) {
        return;
      }

      this.preloadedIndex = targetIndex;
      this.preloadedSource = loadedSource;
      this.preloadedProfile = currentProfile;
      this.emit('preloaded', { index: targetIndex, src: loadedSource });
    })();

    try {
      await this.preloadPromise;
    } finally {
      this.preloadPromise = null;
    }
  }

  async ensureNextClipReady() {
    if (this.nextReadyPromise) return this.nextReadyPromise;

    this.nextReadyPromise = (async () => {
      const targetIndex = this.nextIndex;
      const inactiveSlot = this.getInactiveSlot();
      const inactiveVideo = this.getInactiveVideo();

      if (
        this.preloadedIndex === targetIndex &&
        this.preloadedProfile === this.getPlaybackProfile() &&
        inactiveVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        return this.preloadedSource || inactiveVideo.currentSrc || inactiveVideo.src || null;
      }

      if (inactiveVideo.preload !== 'auto') {
        inactiveVideo.preload = 'auto';
      }

      const tokenKey = `slot-${inactiveSlot}`;
      const loadedSource = await this.loadIntoElement(inactiveVideo, this.getSourceCandidates(targetIndex), tokenKey, 'auto');

      if (!loadedSource || this.isDestroyed) {
        return null;
      }

      this.preloadedIndex = targetIndex;
      this.preloadedSource = loadedSource;
      this.preloadedProfile = this.getPlaybackProfile();
      return loadedSource;
    })();

    try {
      return await this.nextReadyPromise;
    } finally {
      this.nextReadyPromise = null;
    }
  }

  playCurrent() {
    const activeVideo = this.getActiveVideo();

    if (document.hidden) {
      this.shouldResumeWhenVisible = true;
      return;
    }

    const playPromise = activeVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise
        .then(() => {
          this.shouldResumeWhenVisible = false;
          this.emit('playing', { index: this.currentIndex, src: this.currentSource });
        })
        .catch(() => {
          this.shouldResumeWhenVisible = true;
        });
    }
  }

  async playNext() {
    if (this.isDestroyed || this.isTransitioning || !this.playlist.length) return;

    const nextSource = await this.ensureNextClipReady();
    if (!nextSource || this.isDestroyed) {
      this.loadVideo(this.currentIndex + 1);
      return;
    }

    const outgoingVideo = this.getActiveVideo();
    const incomingSlot = this.getInactiveSlot();
    const incomingVideo = this.getInactiveVideo();

    this.isTransitioning = true;
    this.nextIndex = this.normalizeIndex(this.currentIndex + 1);
    incomingVideo.currentTime = 0;
    incomingVideo.classList.add('is-incoming');

    if (!document.hidden) {
      const playPromise = incomingVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        try {
          await playPromise;
        } catch (err) {
          this.isTransitioning = false;
          incomingVideo.classList.remove('is-incoming');
          return;
        }
      }
    } else {
      this.shouldResumeWhenVisible = true;
    }

    requestAnimationFrame(() => {
      if (this.isDestroyed) return;
      this.frameElement.classList.add('is-transitioning');
    });

    this.transitionTimer = window.setTimeout(() => {
      if (this.isDestroyed) return;

      outgoingVideo.pause();
      outgoingVideo.classList.remove('is-active', 'is-incoming');
      incomingVideo.classList.remove('is-incoming');
      incomingVideo.classList.add('is-active');

      this.frameElement.classList.remove('is-transitioning');
      this.activeSlot = incomingSlot;
      this.currentIndex = this.nextIndex;
      this.currentSource = nextSource;
      this.nextIndex = this.normalizeIndex(this.currentIndex + 1);
      this.lastProfile = this.getPlaybackProfile();
      this.preloadedIndex = null;
      this.preloadedSource = '';
      this.preloadedProfile = this.lastProfile;
      this.isTransitioning = false;
      this.transitionTimer = null;

      this.clearElementSource(outgoingVideo);
      this.emit('changed', { index: this.currentIndex, src: this.currentSource });

      if (!document.hidden) {
        this.emit('playing', { index: this.currentIndex, src: this.currentSource });
      }

      this.preloadNext();
    }, this.transitionDurationMs);
  }

  handleEnded(event) {
    if (event.target !== this.getActiveVideo()) return;
    this.playNext();
  }

  handlePlaying(event) {
    if (event.target !== this.getActiveVideo()) return;
    this.preloadNext();
  }

  handleTimeUpdate(event) {
    if (event.target !== this.getActiveVideo() || this.isTransitioning) return;

    const activeVideo = this.getActiveVideo();
    if (!Number.isFinite(activeVideo.duration) || activeVideo.duration <= 0) {
      return;
    }

    const remaining = activeVideo.duration - activeVideo.currentTime;
    if (remaining <= this.bufferLeadSeconds) {
      this.ensureNextClipReady();
    }
  }

  handleVisibilityChange() {
    if (this.isDestroyed) return;

    if (document.hidden) {
      this.shouldResumeWhenVisible = !this.getActiveVideo().paused;
      this.videoElements.forEach((video) => video.pause());
      return;
    }

    if (this.shouldResumeWhenVisible) {
      this.playCurrent();
    }
  }

  handleEnvironmentChange() {
    if (this.isDestroyed) return;

    const nextProfile = this.getPlaybackProfile();
    if (nextProfile === this.lastProfile) {
      return;
    }

    this.lastProfile = nextProfile;
    this.preloadedIndex = null;
    this.preloadedSource = '';
    this.preloadedProfile = nextProfile;
    this.preloadNext();
  }

  pause() {
    this.shouldResumeWhenVisible = false;
    this.videoElements.forEach((video) => video.pause());
  }

  play() {
    this.shouldResumeWhenVisible = true;
    this.playCurrent();
  }

  emit(name, detail) {
    document.dispatchEvent(new CustomEvent(`velora:hero-video:${name}`, { detail }));
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this.videoElements.forEach((video) => {
      video.removeEventListener('ended', this.onEnded);
      video.removeEventListener('playing', this.onPlaying);
      video.removeEventListener('timeupdate', this.onTimeUpdate);
      this.clearElementSource(video);
    });

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.onEnvironmentChange);

    if (navigator.connection && typeof navigator.connection.removeEventListener === 'function') {
      navigator.connection.removeEventListener('change', this.onEnvironmentChange);
    }

    this.frameElement.classList.remove('is-transitioning');
  }
}

window.VideoHeroController = VideoHeroController;

document.addEventListener('DOMContentLoaded', () => {
  const frameElement = document.querySelector('.hero-video-frame');
  if (!frameElement) return;

  window.videoHeroController = new VideoHeroController(frameElement, [
    'vid (1).mp4',
    'vid (2).mp4',
    'vid (3).mp4',
    'vid (4).mp4',
    'vid (5).mp4',
    'vid (6).mp4',
    'vid (7).mp4',
    'vid (8).mp4'
  ]);
});
