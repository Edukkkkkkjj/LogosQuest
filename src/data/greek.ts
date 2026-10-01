import contextsGenerated from '../../content/greek/contexts.generated.json'
import course from '../../content/greek/course.json'
import extras from '../../content/greek/extras.json'
import glyphs from '../../content/greek/glyphs.json'
import lexemesGenerated from '../../content/greek/lexemes.generated.json'
import lexemesPt from '../../content/greek/lexemes.pt.json'
import { texts } from '../../content/texts/registry.greek'
import type { RawContent } from './build'

export const raw: RawContent = { course, glyphs, lexemesGenerated, lexemesPt, extras, contextsGenerated, texts }
