import { MUSIC_NOTES, getKeyIndex } from "./guitar_utils";
import { Chord, chord_library } from "./chords"; // Import chord library

/**
 * Defines the quality of a chord derived from a scale degree.
 */
export type ChordQuality = "Major" | "Minor" | "Diminished" | "Augmented" | "Dominant7th" | "Major7th" | "Minor7th" | "Unknown"; // Expand as needed

/**
 * Represents the mapping from a Roman numeral in a major key context
 * to its scale degree (0-11) and default chord quality.
 */
const MAJOR_KEY_ROMAN_MAP: { [numeral: string]: { degree: number; quality: ChordQuality } } = {
    // Diatonic Triads
    "I": { degree: 0, quality: "Major" },    // Tonic Major
    "ii": { degree: 2, quality: "Minor" },    // Supertonic Minor
    "iii": { degree: 4, quality: "Minor" },    // Mediant Minor
    "IV": { degree: 5, quality: "Major" },    // Subdominant Major
    "V": { degree: 7, quality: "Major" },    // Dominant Major
    "vi": { degree: 9, quality: "Minor" },    // Submediant Minor
    "vii°": { degree: 11, quality: "Diminished" },// Leading Tone Diminished

    // Common Diatonic 7ths (can be expanded)
    "Imaj7": { degree: 0, quality: "Major7th"},
    "ii7": { degree: 2, quality: "Minor7th"},
    "iii7": { degree: 4, quality: "Minor7th"},
    "IVmaj7": { degree: 5, quality: "Major7th"},
    "V7": { degree: 7, quality: "Dominant7th"},
    "vi7": { degree: 9, quality: "Minor7th"},
    "viiø7": { degree: 11, quality: "Minor7th"}, // Half-diminished (m7b5) - approximate for now
    // Aliases or variations can be added here (e.g., "V/V")

    // TODO: Add support for secondary dominants, borrowed chords, etc.
};

/**
 * Simple helper to map quality types to common suffixes used in chord_library keys.
 * This is a basic mapping and might need refinement based on chord_library structure.
 */
function qualityToChordKeySuffix(quality: ChordQuality): string {
    switch (quality) {
        case "Major": return "_MAJOR"; // Assuming MAJOR suffix exists
        case "Minor": return "_MINOR"; // Assuming MINOR suffix exists
        case "Diminished": return "_DIM"; // Placeholder - Check chord_library
        case "Augmented": return "_AUG"; // Placeholder - Check chord_library
        case "Dominant7th": return "7"; // Common notation
        case "Major7th": return "MAJ7"; // Common notation
        case "Minor7th": return "m7"; // Common notation - might need checking (AM7 vs A_MINOR7)
        default: return ""; // Unknown or simple triad assumed if no suffix
    }
}

/**
 * Calculates the chord name and attempts to find a matching key in the chord library
 * based on a root note index and a Roman numeral string (assuming Major Key context).
 *
 * @param rootNoteIndex - The index (0-11) of the key's root note.
 * @param romanNumeral - The Roman numeral string (e.g., "I", "vi", "V7").
 * @returns An object containing the calculated chord name and the potential chord library key.
 */
export function getChordInKey(
    rootNoteIndex: number,
    romanNumeral: string
): { chordName: string; chordKey: string | null; quality: ChordQuality } {
    const mapEntry = MAJOR_KEY_ROMAN_MAP[romanNumeral];
    if (!mapEntry) {
        console.warn(`Roman numeral "${romanNumeral}" not found in map.`);
        return { chordName: `${romanNumeral}?`, chordKey: null, quality: "Unknown" };
    }

    const chordRootIndex = (rootNoteIndex + mapEntry.degree) % 12;
    const chordRootName = MUSIC_NOTES[chordRootIndex]?.[0] ?? "?"; // Get the primary name (e.g., C# over Db)

    let fullChordName: string;
    // Construct the full chord name based on quality
    switch (mapEntry.quality) {
        case "Major":
            fullChordName = `${chordRootName}`; // Often just the letter for major
            break;
        case "Minor":
            fullChordName = `${chordRootName}m`;
            break;
        case "Diminished":
            fullChordName = `${chordRootName}dim`;
            break;
        case "Augmented":
            fullChordName = `${chordRootName}aug`;
            break;
         case "Dominant7th":
            fullChordName = `${chordRootName}7`;
            break;
        case "Major7th":
            fullChordName = `${chordRootName}maj7`;
            break;
        case "Minor7th":
            fullChordName = `${chordRootName}m7`;
            break;
        default:
            fullChordName = `${chordRootName} (${mapEntry.quality})`; // Fallback
            break;
    }


    // --- Attempt to find matching chordKey in chord_library ---
    // This part is heuristic and depends heavily on naming conventions in chord_library.
    let potentialKey: string | null = null;

    // 1. Try direct match with constructed name (e.g., "Am7")
    const directKey = Object.keys(chord_library).find(key => chord_library[key].name === fullChordName);
    if (directKey) {
        potentialKey = directKey;
    } else {
         // 2. Try constructing key from root + suffix (e.g., A + _MINOR + 7 -> A_MINOR7 ?)
         // This needs careful mapping based on how keys ARE ACTUALLY defined in chords.ts
        const suffix = qualityToChordKeySuffix(mapEntry.quality);
        let constructedKeyBase = chordRootName.replace("#", "sharp"); // Replace '#' if keys use 'sharp'

        // Check common variations (e.g., C_MAJOR, G7, AM7, B_MINOR)
        const variationsToTest = [
            `${constructedKeyBase}${suffix}`, // e.g., A_MINOR, C_MAJOR
            `${constructedKeyBase.toUpperCase()}${suffix}`, // e.g., A_MINOR, C_MAJOR
            `${constructedKeyBase}${suffix.toUpperCase()}`, // e.g., Am7, Cmaj7 (might match chord name)
             // Add specific overrides if needed
             mapEntry.quality === 'Dominant7th' ? `${constructedKeyBase}7` : null, // G7
             mapEntry.quality === 'Major7th' ? `${constructedKeyBase.toUpperCase()}MAJ7` : null, // AMAJ7
             mapEntry.quality === 'Minor7th' ? `${constructedKeyBase}m7` : null, // Am7, Bm7
        ].filter(v => v !== null); // Remove nulls


        for (const testKey of variationsToTest) {
             if (testKey && chord_library[testKey]) {
                potentialKey = testKey;
                break;
            }
        }

         if (!potentialKey) {
            console.warn(`Could not find key in chord_library for: ${fullChordName} (tried variations like ${variationsToTest.join(', ')})`);
         }
    }


    return {
        chordName: fullChordName,
        chordKey: potentialKey,
        quality: mapEntry.quality,
    };
}