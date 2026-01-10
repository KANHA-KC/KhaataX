import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from './Input';
import { useTranslation } from '../../context/LanguageContext';
import { transliterateSentence } from '../../utils/transliterate';

interface TransliteratedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    fullWidth?: boolean;
    onValueChange: (value: string) => void;
}

export const TransliteratedInput = forwardRef<HTMLInputElement, TransliteratedInputProps>(({
    onValueChange,
    value,
    ...props
}, ref) => {
    const { language } = useTranslation();
    const [localValue, setLocalValue] = useState(value as string || '');

    useEffect(() => {
        setLocalValue(value as string || '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        // If in Hindi mode and user typed a space, transliterate the current text
        if (language === 'hi' && newVal.endsWith(' ')) {
            const hindiText = transliterateSentence(newVal);
            setLocalValue(hindiText);
            onValueChange(hindiText);
        } else {
            onValueChange(newVal);
        }
    };

    const handleBlur = () => {
        if (language === 'hi') {
            const hindiText = transliterateSentence(localValue);
            setLocalValue(hindiText);
            onValueChange(hindiText);
        }
    };

    return (
        <Input
            {...props}
            ref={ref}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
});

TransliteratedInput.displayName = 'TransliteratedInput';
