import { FeatureCategoryName, FeatureTypeDescriptor, FeatureCategoryDescriptor } from "../feature";
import { registerFeatureCategory } from "../feature_registry";

import { NotesFeature } from "./features/notes_feature";
import { ScaleFeature } from "./features/scale_feature";
import { ChordFeature } from "./features/chord_feature";
import { MetronomeFeature } from "./features/metronome_feature";
import { TriadFeature } from "./features/triad_feature";
import { ChordProgressionFeature } from "./features/chord_progression_feature"; // Import the new feature

// Map feature type names (string literals) to their corresponding class descriptors
// We cast the class itself to FeatureTypeDescriptor because the static properties match.
const guitarFeatureTypes = new Map<string, FeatureTypeDescriptor>([
    [NotesFeature.typeName, NotesFeature as unknown as FeatureTypeDescriptor],
    [ScaleFeature.typeName, ScaleFeature as unknown as FeatureTypeDescriptor],
    [ChordFeature.typeName, ChordFeature as unknown as FeatureTypeDescriptor],
    [ChordProgressionFeature.typeName, ChordProgressionFeature as unknown as FeatureTypeDescriptor], // Register the new feature
    [TriadFeature.typeName, TriadFeature as unknown as FeatureTypeDescriptor],
    [MetronomeFeature.typeName, MetronomeFeature as unknown as FeatureTypeDescriptor], // Keep metronome last?
]);

const guitarCategoryDescriptor: FeatureCategoryDescriptor = {
    categoryName: FeatureCategoryName.Guitar,
    displayName: "Guitar Tools",
    featureTypes: guitarFeatureTypes,
};

registerFeatureCategory(guitarCategoryDescriptor);

console.log("Guitar feature category registered with types:", Array.from(guitarFeatureTypes.keys()));