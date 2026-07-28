import { useEffect, useRef, useState } from "react";
import { experienceScenes } from "../scenes/sceneRegistry";
import "./ExperienceEngine.css";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export default function ExperienceEngine() {
  const experienceRef = useRef(null);

  const [experienceState, setExperienceState] = useState({
    progress: 0,
    activeSceneIndex: 0,
    sceneProgress: 0,
  });

  useEffect(() => {
    let animationFrameId = null;

    const updateExperience = () => {
      const experience = experienceRef.current;

      if (!experience) return;

      const rect = experience.getBoundingClientRect();

      const travelDistance = Math.max(
        experience.offsetHeight - window.innerHeight,
        1
      );

      const progress = clamp(-rect.top / travelDistance, 0, 1);

      const scenePosition = progress * experienceScenes.length;

      const activeSceneIndex = Math.min(
        Math.floor(scenePosition),
        experienceScenes.length - 1
      );

      const sceneProgress = clamp(
        scenePosition - activeSceneIndex,
        0,
        1
      );

      setExperienceState({
        progress,
        activeSceneIndex,
        sceneProgress,
      });

      animationFrameId = null;
    };

    const requestUpdate = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(updateExperience);
    };

    updateExperience();

    window.addEventListener("scroll", requestUpdate, {
      passive: true,
    });

    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const activeScene =
    experienceScenes[experienceState.activeSceneIndex];

  return (
    <main
      ref={experienceRef}
      className="experience-engine"
      style={{
        "--experience-progress": experienceState.progress,
        "--scene-progress": experienceState.sceneProgress,
        "--scene-count": experienceScenes.length,
      }}
    >
      <div className="experience-engine__viewport">
        <div
          className="experience-engine__camera"
          data-scene={activeScene.id}
        >
          <div className="experience-engine__core" aria-hidden="true">
            <span>HSU</span>
          </div>

          <section
            key={activeScene.id}
            className="experience-engine__scene"
            aria-live="polite"
          >
            <p className="experience-engine__scene-index">
              {activeScene.index}
            </p>

            <h1>{activeScene.title}</h1>

            <p className="experience-engine__scene-description">
              {activeScene.description}
            </p>
          </section>
        </div>

        <div
          className="experience-engine__progress"
          aria-hidden="true"
        >
          <span />
        </div>
      </div>
    </main>
  );
}