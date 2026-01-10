const CONSONANTS: Record<string, string> = {
    'kh': 'ख', 'gh': 'घ', 'chh': 'छ', 'ch': 'च', 'jh': 'झ', 'nh': 'न्ह',
    'thh': 'ठ', 'dhh': 'ढ', 'th': 'थ', 'dh': 'ध', 'ph': 'फ', 'bh': 'भ', 'sh': 'श',
    'k': 'क', 'g': 'ग', 'j': 'ज', 't': 'त', 'd': 'द', 'n': 'न', 'p': 'प', 'b': 'ब', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व', 's': 'स', 'h': 'ह',
    'z': 'ज़', 'f': 'फ़', 'q': 'क़', 'x': 'क्ष', 'T': 'ट', 'D': 'ड', 'N': 'ण'
};

const MATRAS: Record<string, string> = {
    'aa': 'ा', 'ai': 'ै', 'au': 'ौ', 'ee': 'ी', 'oo': 'ू',
    'a': '', 'i': 'ि', 'e': 'े', 'o': 'ो', 'u': 'ु'
};

const INDEPENDENT_VOWELS: Record<string, string> = {
    'aa': 'आ', 'ai': 'ऐ', 'au': 'औ', 'ee': 'ई', 'oo': 'ऊ',
    'a': 'अ', 'i': 'इ', 'e': 'ए', 'o': 'ओ', 'u': 'उ'
};

/**
 * Robust offline phonetic transliteration engine.
 * Matches longest phonetic patterns and handles conjuncts.
 */
export const transliterate = (text: string): string => {
    if (!text || !/[a-zA-Z]/.test(text)) return text;

    let result = '';
    let i = 0;
    const lower = text.toLowerCase();

    while (i < text.length) {
        let matched = false;

        // 1. Try matching consonants
        for (const len of [3, 2, 1]) {
            const part = text.substring(i, i + len);
            const lowerPart = part.toLowerCase();

            // Check if we have a consonant match (case sensitive for T, D, N)
            const devPart = CONSONANTS[part] || CONSONANTS[lowerPart];

            if (devPart) {
                let nextI = i + len;
                let vowelMatched = false;

                // 2. Check for following vowel
                for (const vLen of [2, 1]) {
                    const vPart = lower.substring(nextI, nextI + vLen);
                    if (MATRAS[vPart] !== undefined) {
                        result += devPart + MATRAS[vPart];
                        i = nextI + vLen;
                        vowelMatched = true;
                        break;
                    }
                }

                if (!vowelMatched) {
                    // It's a consonant followed by another consonant or end
                    // In phonetic typing, trailing consonant is usually full, intermediate is half
                    const isEnd = nextI >= text.length || text[nextI] === ' ';
                    result += devPart + (isEnd ? '' : '्');
                    i = nextI;
                }
                matched = true;
                break;
            }
        }

        if (matched) continue;

        // 2. Try matching independent vowels
        for (const len of [2, 1]) {
            const part = lower.substring(i, i + len);
            if (INDEPENDENT_VOWELS[part]) {
                result += INDEPENDENT_VOWELS[part];
                i += len;
                matched = true;
                break;
            }
        }

        if (matched) continue;

        // 3. Fallback
        result += text[i];
        i++;
    }

    return result;
};

/**
 * Handles real-time transliteration for a sentence or word.
 */
export const transliterateSentence = (sentence: string): string => {
    const words = sentence.split(/(\s+)/);
    const results = words.map(word => {
        if (word.trim() === '' || !/[a-zA-Z]/.test(word)) return word;
        return transliterate(word);
    });
    return results.join('');
};

/**
 * Normalizes text for search comparison.
 * Maps Hindi script back to roman phonetics and simplifies to base sounds.
 */
export const normalizeForSearch = (text: string): string => {
    if (!text) return '';

    let result = text.trim().toLowerCase();

    // Mapping for common Hindi characters to simplified roman phonetics
    const hindiToRoman: Record<string, string> = {
        'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'क': 'k',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
        'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
        'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
        '्': '', 'ं': 'n', 'ँ': 'n', 'ः': 'h', '़': ''
    };

    // Replace Hindi characters
    let normalized = '';
    for (const char of result) {
        normalized += hindiToRoman[char] || char;
    }

    // Further simplify: remove duplicate vowels and spaces for fuzzy matching
    return normalized
        .replace(/[aeiou]{2,}/g, (m) => m[0]) // ee -> e, aa -> a
        .replace(/\s+/g, '');
};
