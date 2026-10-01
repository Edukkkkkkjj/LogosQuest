import contextsGenerated from '../../content/hebrew/contexts.generated.json'
import course from '../../content/hebrew/course.json'
import extras from '../../content/hebrew/extras.json'
import glyphs from '../../content/hebrew/glyphs.json'
import lexemesGenerated from '../../content/hebrew/lexemes.generated.json'
import lexemesPt from '../../content/hebrew/lexemes.pt.json'
import { texts } from '../../content/texts/registry.hebrew'
import type { RawContent } from './build'

export const raw: RawContent = { course, glyphs, lexemesGenerated, lexemesPt, extras, contextsGenerated, texts }
