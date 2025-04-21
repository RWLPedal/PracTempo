// ts/guitar/guitar.ts
import { FeatureCategoryName, FeatureTypeDescriptor, FeatureCategoryDescriptor, SettingsUISchemaItem } from "../feature";
import { registerFeatureCategory } from "../feature_registry";
import { AVAILABLE_TUNINGS } from "./fretboard";
import { FretboardColorScheme } from "./colors";

// Import features
// ... (feature imports remain the same) ...
import { NotesFeature } from "./features/notes_feature";
import { ScaleFeature } from "./features/scale_feature";
import { ChordFeature } from "./features/chord_feature";
import { CagedFeature } from "./features/caged_feature";
import { MetronomeFeature } from "./features/metronome_feature";
import { TriadFeature } from "./features/triad_feature";
import { ChordProgressionFeature } from "./features/chord_progression_feature";


// Import default settings AND the specific class for the factory
import { DEFAULT_GUITAR_SETTINGS, GuitarSettings } from "./guitar_settings";
// --- REMOVED import of GuitarSettings from here, import class instead ---
import { GuitarIntervalSettings } from "./guitar_interval_settings"; // Import the CLASS for the factory

const guitarFeatureTypes = new Map<string, FeatureTypeDescriptor>([
    // ... (feature type mapping remains the same) ...
    [NotesFeature.typeName, NotesFeature as unknown as FeatureTypeDescriptor],
    [ScaleFeature.typeName, ScaleFeature as unknown as FeatureTypeDescriptor],
    [ChordFeature.typeName, ChordFeature as unknown as FeatureTypeDescriptor],
    [ChordProgressionFeature.typeName, ChordProgressionFeature as unknown as FeatureTypeDescriptor],
    [TriadFeature.typeName, TriadFeature as unknown as FeatureTypeDescriptor],
    [MetronomeFeature.typeName, MetronomeFeature as unknown as FeatureTypeDescriptor],
    [CagedFeature.typeName, CagedFeature as unknown as FeatureTypeDescriptor],
]);

// getGuitarSettingsUISchema function remains the same
function getGuitarSettingsUISchema(): SettingsUISchemaItem[] {
    // Prepare options for select dropdowns
    const tuningOptions = Object.keys(AVAILABLE_TUNINGS).map(key => ({
        value: key,
        text: key // Display the key name (e.g., "Standard", "Drop D")
    }));

    const handednessOptions = [
        { value: "right", text: "Right-Handed" },
        { value: "left", text: "Left-Handed" },
    ];

    // Define options for the color scheme dropdown
    const colorSchemeOptions: { value: FretboardColorScheme, text: string }[] = [
        { value: "default", text: "Default (Root=Red)" },
        { value: "note", text: "Note Name Colors" },
        { value: "interval", text: "Interval Colors" },
    ];

    // Return the schema array describing the UI elements
    return [
        {
            key: "handedness", // Corresponds to GuitarSettings.handedness
            label: "Diagram Handedness",
            type: "select",
            options: handednessOptions,
            description: "Orientation of fretboard diagrams.",
        },
        {
            key: "tuning", // Corresponds to GuitarSettings.tuning
            label: "Tuning",
            type: "select",
            options: tuningOptions,
            description: "Select the guitar tuning.",
        },
        {
            key: "colorScheme", // Corresponds to GuitarSettings.colorScheme
            label: "Fretboard Color Scheme",
            type: "select",
            options: colorSchemeOptions,
            description: "How notes on the fretboard are colored.",
        },
    ];
}

const guitarCategoryDescriptor: FeatureCategoryDescriptor = {
    categoryName: FeatureCategoryName.Guitar,
    displayName: "Guitar Tools",
    featureTypes: guitarFeatureTypes,
    getSettingsUISchema: getGuitarSettingsUISchema,
};

// Register the category, its default settings data, AND the factory function
registerFeatureCategory(
    guitarCategoryDescriptor,
    DEFAULT_GUITAR_SETTINGS,
    () => new GuitarIntervalSettings() // Provide the factory function
);

console.log("Guitar feature category registered with types:", Array.from(guitarFeatureTypes.keys()));