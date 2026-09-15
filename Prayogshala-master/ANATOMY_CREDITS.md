# Human Anatomy Asset Credits

The Human Body Anatomy experiment combines two openly distributed anatomical
sources. The viewer, grouping, interaction, animation overlays, web materials,
and source-file alignment were implemented for Prayogshala.

## Z-Anatomy Musculoskeletal Model

- Local asset: `public/body.glb`
- Work: Z-Anatomy, the libre 3D atlas of anatomy
- Project: https://www.z-anatomy.com/
- Source repository: https://github.com/Z-Anatomy/Models-of-human-anatomy
- Creators credited by the project: Gauthier Kervyn, Marcin Zielinski, and
  Kousaku Okubo
- Upstream model: BodyParts3D, The Database Center for Life Science
- License: Creative Commons Attribution-ShareAlike 4.0 International
- License URL: https://creativecommons.org/licenses/by-sa/4.0/

The local GLB contains the Z-Anatomy naming, descriptions, Wikipedia links,
Blender metadata, and musculoskeletal geometry. It was exported to GLB with
Draco compression and includes bones, skeletal muscles, bursae, and tendon
sheaths. Prayogshala groups and displays this content by anatomical layer.

The exact exporter and revision used to create the local GLB were not recorded
in the original repository. Its source lineage was identified from matching
Z-Anatomy object names, metadata fields, and source links. Z-Anatomy's upstream
credits should be consulted before extracting or redistributing individual
meshes outside this project.

## HuBMAP Human Reference Atlas

- Local assets: `public/anatomy/hra-v1.2/*.glb`
- Work: Human Reference Atlas 3D Reference Object Library, VH Male v1.2
- Organization: HuBMAP Consortium
- Project: https://humanatlas.io/3d-reference-library
- Source repository: https://github.com/hubmapconsortium/ccf-3d-reference-object-library
- License: Creative Commons Attribution 4.0 International
- License URL: https://creativecommons.org/licenses/by/4.0/

Included source files:

- `VH_M_Skin.glb`
- `VH_M_Lung.glb`
- `VH_M_Liver.glb`
- `VH_M_Pancreas.glb`
- `VH_M_Gallbladder.glb`
- `VH_M_Biliary_Tree.glb`
- `VH_M_Small_Intestine.glb`
- `SBU_M_Intestine_Large.glb`
- `VH_M_Heart.glb`
- `VH_M_Blood_Vasculature.glb`
- `VH_M_Kidney_L.glb`
- `VH_M_Kidney_R.glb`
- `VH_M_Ureter_L.glb`
- `VH_M_Ureter_R.glb`
- `VH_M_Urinary_Bladder.glb`
- `VH_M_Urethra.glb`
- `Allen_M_Brain.glb`
- `VH_M_Spinal_Cord.glb`

Modifications in the viewer: the original files remain byte-for-byte GLBs, but
at runtime they receive one uniform scale and translation to align their common
VH Male reference space with the Z-Anatomy model. Materials are cloned for
opacity, selection, and cross-fade controls. No anatomy geometry was fabricated.

## Coverage Notes

- Z-Anatomy supplies the skeletal and muscular layers.
- HRA supplies the body surface and the listed internal anatomy.
- The nervous layer is partial: brain and spinal cord only.
- The respiratory model includes lungs and major airways.
- The digestive model is incomplete and does not include the mouth, esophagus,
  or stomach.
- The animations and moving particles are simplified educational overlays, not
  anatomical geometry or physiologically exact simulations.
- This experiment is educational and is not intended for diagnosis or clinical
  decision-making.
