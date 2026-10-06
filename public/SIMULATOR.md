# HPLC Simulator browser edition

The application at `simulator.html` is a plain JavaScript and Canvas port of the supplied Java project whose About dialog identifies it as **version 1.16**. It runs locally without Java, packages, a build server, remote scripts, or network services.

## Included

- Waters Acquity BEH C18 (21 compounds) and Agilent Zorbax SB-C18 (22 compounds), each with acetonitrile and methanol coefficients.
- Original per-phase default samples, with editable concentrations, library additions/removals, custom coefficient entry/editing, and synthetic random unknowns.
- Isocratic and piecewise-linear gradient elution; mixing and non-mixing dwell volumes.
- Original porosity/hold-up, viscosity, Darcy pressure, Wilke–Chang diffusion, reduced van Deemter efficiency, Gaussian concentration, detector, and post-column tubing calculations.
- Initial/instantaneous pressure and viscosity, composition, selected-compound retention factor and column-position overlays.
- Live Canvas plot, peak selection, zoom, reference trace, readable results table, and responsive phone navigation.
- New JSON methods, CSV (method + peak results + sampled trace), and PNG graph export.

The Fluid Visualizer is also included as a separate browser application.

## Source and data provenance

The model and data were ported from the supplied HPLC Simulator Java v1.16 project. The extracted database records its source SHA256 in `public/assets/simulator/compounds.js`. Original Java projects and private signing/build material are not included in this repository.

Contributor credits and the CC BY-NC-SA 3.0 US license attribution are retained on the website. The Development downloads remain explicitly historical v1.1.3/v1.0 archives; they have not been relabeled as the supplied latest source.

## Deliberate changes and retained approximations

1. **Run duration:** automatic in both modes, ending at 1.05 × (retention time + 3σ) of the last-eluting compound, rounded up to a sampling instant. Gradient integration extends its horizon until all compounds elute or the detector sample cap is reached. Manual duration remains available. Final programmed composition is held.
2. **Initial gradient properties:** viscosity, mean diffusion, efficiency, and tubing dispersion use the initial gradient composition. Java used the hidden isocratic fraction for these calculations, so reference comparisons set that fraction to the gradient initial fraction. Pressure/viscosity overlays use inlet composition, not a spatial column integration.
3. **Original width approximations:** isocratic variance includes detector, injection, and tubing contributions; the retention term includes tubing delay as in v1.16. Gradient variance uses the exit retention factor and omits injection variance, preserving the Java TODO rather than claiming to resolve it.
4. **Units:** retention displayed in minutes; sigma in seconds; pressure in bar; concentration and signal offset in µM; injected amount in pmol. Noise parameter in nM·√s gives a concentration standard deviation proportional to `1/sqrt(detector time constant)`. The Java code added its raw signal offset to a molar trace; the browser defines the offset explicitly in displayed µM units.
5. **Noise:** deterministic Gaussian samples make redraws reproducible. Java used unseeded random Gaussian samples. Random-compound distributions match the original formulas but are not sequence-identical to Java's PRNG.
6. **Drawing and export:** fixed detector samples at the chosen samples-per-second rate are shared by plotting and CSV export. The 100,000-point cap truncates long runs with a warning. Noise refreshes on recalculation and remains fixed for zooming, panning, and references. Method format v2 stores samplingRate; v1 point counts are converted using the saved duration.
7. **Input bounds:** finite, positive physical parameters and strict gradient times are enforced. Custom `log10(k)` is limited to −12…12; extreme custom inputs produce a visible error, retaining the last valid graph. This avoids overflow and stalled calculations. Validation also applies to imports.
8. **Save format:** `hplc-simulator-web`, schema version 1, stores the complete method and sample including custom coefficients. Java serialized method files are not imported. The hidden experimental Java gradient optimizer is not ported.

## Verification

Run from the project root:

```powershell
node --test tests/model.test.js
```

Reference fixtures were generated from the numerical statements in the Java v1.16 source using a headless Java harness. The resulting JSON fixtures are included in `tests/`.

The 32 reference cases cover both phases, both solvents, isocratic/gradient modes, 25/60 °C, and 0/40 cm post-column tubing. They compare hold-up time, plate count, pressure, diffusion, tubing delay, retention, and width at a relative tolerance of 1e-9. Additional tests cover all 43 phase-specific library entries, constant gradients, zero mixing volume, non-elution termination, injected-amount conservation, flow scaling, malformed methods, custom/library equivalence, and noise/overlays.

UI checks cover live flow/composition updates, reference/zoom, gradient validation, sample additions/removals, custom editing, and narrow/mobile layouts. Numerical agreement with the legacy implementation is not validation against experimental measurements.

## Files

- `simulator/workspace.html`: simulator page template, inserted by `build_site.py`.
- `public/assets/simulator/model.js`: pure calculation and validation code, usable from Node tests.
- `public/assets/simulator/compounds.js`: extracted database.
- `public/assets/simulator/app.js`: controls, Canvas, import/export, and interaction.
- `public/assets/simulator/simulator.css`: responsive workspace styles.

The earlier v1.1.3 draft in the root `simulator/` directory is not loaded. The live application uses only the assets under `public/assets/simulator/`.
