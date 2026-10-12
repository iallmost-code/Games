# Godot Web Editor: seven heroes / first five floors

Implemented as a Web-only hybrid renderer test, superseding the earlier proposed complete native port. The owner requested the playable ZIP immediately rather than another design approval. The implementation preserves the original JavaScript gameplay model, menus, audio and persistence and renders read-only snapshots with native Godot nodes. A complete native GDScript port is outside this prototype.

Target: exact Godot 4.7.2 Standard Web Editor, Compatibility renderer. Baseline production main ffa4c79f846a0e88218c549bea29e77afc8c35d8, v78 ENDLESS OVERTIME. Branch codex/godot-five-floors remains unmerged. Root production index.html/assets stay untouched.

See [the runnable project](../../../prototypes/godot-five-floor-web/README.md) for download packaging, launch instructions, architecture, scope and limitations. Source plus the ready ZIP live under prototypes/godot-five-floor-web. All seven heroes use authored native texture atlases with read-only selectors. First-five floor goals, combat, stats, AI, collision, progression and saves use the original model. Preview hero access is menu-only and does not overwrite earned unlock fields. Floor 5 keeps original victory/rewards; deeper imported runs are retained but cannot continue in this preview.

Native world/FX tests cover projection, pooling, seven heroes, five floors, door geometry, quality caps and snapshot purity. Browser bridge tests cover assisted floor flow, checkpoint resume, EC1 and isolated slots; real official Web Editor import/run verifies the downloadable artifact itself. Do not infer physical Android performance from software-browser checks.
