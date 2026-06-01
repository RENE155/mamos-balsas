import type { StoryTheme } from '@/types';

export const STORY_THEMES: StoryTheme[] = [
  {
    id: 'adventure',
    name_lt: 'Nuotykiai',
    name_en: 'Adventure',
    description_lt: 'Įdomūs nuotykiai su drąsiais herojais',
    icon: '🗺️',
    prompt_hint: 'Istorija apie kelionę ir naujus atradimus',
  },
  {
    id: 'animals',
    name_lt: 'Gyvūnai',
    name_en: 'Animals',
    description_lt: 'Pasakos su miškų ir namų gyvūnais',
    icon: '🐻',
    prompt_hint: 'Istorija su gyvūnais kaip pagrindiniais veikėjais',
  },
  {
    id: 'space',
    name_lt: 'Kosmosas',
    name_en: 'Space',
    description_lt: 'Kelionės tarp žvaigždžių ir planetų',
    icon: '🚀',
    prompt_hint: 'Istorija apie kosmosą, žvaigždes ir planetas',
  },
  {
    id: 'fairy_tale',
    name_lt: 'Pasaka',
    name_en: 'Fairy Tale',
    description_lt: 'Klasikinės pasakų temos su magija',
    icon: '✨',
    prompt_hint: 'Klasikinė pasaka su magija ir stebuklingais elementais',
  },
  {
    id: 'nature',
    name_lt: 'Gamta',
    name_en: 'Nature',
    description_lt: 'Pasakos apie miškus, upes ir kalnus',
    icon: '🌲',
    prompt_hint: 'Istorija apie gamtą, miškus ir gamtos stebuklus',
  },
  {
    id: 'friendship',
    name_lt: 'Draugystė',
    name_en: 'Friendship',
    description_lt: 'Šiltos istorijos apie draugystę',
    icon: '💝',
    prompt_hint: 'Istorija apie draugystę ir pagalbą kitiems',
  },
  {
    id: 'dreams',
    name_lt: 'Sapnai',
    name_en: 'Dreams',
    description_lt: 'Stebuklingos sapnų istorijos',
    icon: '🌙',
    prompt_hint: 'Istorija apie sapnus ir nakties stebuklus',
  },
  {
    id: 'surprise',
    name_lt: 'Nustebink mane',
    name_en: 'Surprise Me',
    description_lt: 'Atsitiktinė tema',
    icon: '🎁',
    prompt_hint: 'Sukurk originalią pasaką su netikėtais posūkiais',
  },
];

export function getThemeById(id: string): StoryTheme | undefined {
  return STORY_THEMES.find((theme) => theme.id === id);
}
