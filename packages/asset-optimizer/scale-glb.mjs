#!/usr/bin/env node
/**
 * Scale GLB mesh vertices by a given factor
 * Usage: node scripts/scale-glb.mjs <input.glb> <scale> [output.glb]
 *
 * Example: node scripts/scale-glb.mjs model.glb 0.01 model_scaled.glb
 */

import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { readFile, writeFile } from "fs/promises";

const [,, inputPath, scaleArg, outputPath] = process.argv;

if (!inputPath || !scaleArg) {
  console.log("Usage: node scripts/scale-glb.mjs <input.glb> <scale> [output.glb]");
  console.log("Example: node scripts/scale-glb.mjs huge_model.glb 0.001 scaled_model.glb");
  process.exit(1);
}

const scale = parseFloat(scaleArg);
const output = outputPath || inputPath.replace(".glb", "_scaled.glb");

console.log(`Scaling ${inputPath} by ${scale}...`);

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS);

io.registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});

const data = await readFile(inputPath);
const document = await io.readBinary(new Uint8Array(data));

// Scale all mesh primitive positions
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    const positionAccessor = primitive.getAttribute("POSITION");
    if (positionAccessor) {
      const positions = positionAccessor.getArray();
      if (positions) {
        for (let i = 0; i < positions.length; i++) {
          positions[i] *= scale;
        }
        positionAccessor.setArray(positions);
        console.log(`  Scaled ${positions.length / 3} vertices in mesh "${mesh.getName()}"`);
      }
    }
  }
}

// Also scale node translations
for (const node of document.getRoot().listNodes()) {
  const translation = node.getTranslation();
  node.setTranslation([
    translation[0] * scale,
    translation[1] * scale,
    translation[2] * scale,
  ]);
}

// Scale skin inverse bind matrices if present
for (const skin of document.getRoot().listSkins()) {
  const ibmAccessor = skin.getInverseBindMatrices();
  if (ibmAccessor) {
    const ibm = ibmAccessor.getArray();
    if (ibm) {
      // Scale translation components of each 4x4 matrix (indices 12, 13, 14)
      for (let i = 0; i < ibm.length; i += 16) {
        ibm[i + 12] *= scale;
        ibm[i + 13] *= scale;
        ibm[i + 14] *= scale;
      }
      ibmAccessor.setArray(ibm);
      console.log(`  Scaled inverse bind matrices for skin "${skin.getName()}"`);
    }
  }
}

const outputBuffer = await io.writeBinary(document);
await writeFile(output, outputBuffer);

console.log(`\nSaved to ${output}`);
console.log(`Original size: ${data.length} bytes`);
console.log(`Output size: ${outputBuffer.length} bytes`);
