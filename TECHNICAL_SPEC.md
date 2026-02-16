# Stairway to Injury — MVP Technical Blueprint

This repository now contains a Godot 4.x starter structure for a 2.5D ragdoll damage simulator with split vertical gameplay (top/bottom viewport).

## Implemented Foundation

- **9:16 vertical project defaults** in `project.godot` (1080x1920).
- **Scene structure** for menu, intro, simulation, and result flow in `/scenes`.
- **Ragdoll framework** in `ragdoll_builder.gd` with body parts, mass distribution, joint setup, and 2.5D constraints.
- **Damage architecture** in `damage_system.gd` using:

  ```text
  mass × (relative_velocity²) × damage_multiplier × angle_multiplier × combo_multiplier
  ```

- **Body part state management** in `body_part.gd` with break threshold and visual damage tinting.
- **Replay event logging and extraction** in `replay_system.gd` (highest-impact event + slow-motion window).
- **Game loop orchestrator** in `game_manager.gd` for countdown, kick start, synced timer, winner decision.
- **Face texture application utility** in `face_texture_applier.gd` supporting head mesh texture override or attached face plane.
- **Per-viewport camera behavior** in `camera_controller.gd` with smooth follow, bounds, and impact shake hooks.

## MVP Alignment Notes

This scaffold is designed to accelerate delivery of the requested MVP but still requires content production and integration work:

1. UI for names/image upload/manual crop tool.
2. Intro cinematic sequencing (camera, animation, TTS playback, boot kick animation).
3. Staircase geometry and mirrored dynamic props.
4. Collision hookups from physics contacts to `DamageSystem.apply_collision_damage`.
5. Winner scene visual assets (bandages, medal, background loser).
6. Final replay playback controls with 0.2x timescale and impact callout.

## Suggested Next Milestones

1. Build reusable `CharacterRig.tscn` containing all body parts and collision shapes.
2. Build `StaircaseCourse.tscn` with deterministic obstacle behavior.
3. Wire `simulation.tscn` to spawn two independent course instances and synchronize start.
4. Add menu UX for image selection + crop.
5. Add text-to-speech integration service abstraction.

