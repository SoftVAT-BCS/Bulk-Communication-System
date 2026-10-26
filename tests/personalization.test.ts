import {it,expect} from 'vitest';
import {personalize,validateVariables} from '../apps/web/src/server/personalization';
it('escapes substituted text and disallows executable attribute variables',()=>{expect(personalize('<p>{{student_name}}</p>',{student_name:'<script>bad</script>'},true)).toBe('<p>&lt;script&gt;bad&lt;/script&gt;</p>');expect(()=>validateVariables('Test','<a href="{{student_name}}">X</a>')).toThrow();});
it('rejects unknown and missing variables',()=>{expect(()=>validateVariables('{{secret}}','<p>Text</p>')).toThrow();expect(()=>personalize('{{course_name}}',{})).toThrow();expect(()=>validateVariables('Test','{{bad')).toThrow();});
