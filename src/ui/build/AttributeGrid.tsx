/**
 * AttributeGrid (design-spec §3.3, rewired to AttributeSlider rev 3/F3) —
 * the 20 attribute inputs as 2K-builder-style sliders in 6 fieldset groups
 * by AttrGroup (lowercase legends: these group ATTRIBUTES, not badges —
 * Category is a different axis, see BudgetGrid's hint). Grouping and labels
 * come from the engine's canonical vocabulary, never re-declared here.
 *
 * F7: the fieldset carries `data-attr-group` so the §2.8 identity layer can
 * set --cat for the sliders inside it. It is the AttrGroup this fieldset was
 * already built from — no new value, no mapping, and no colour named here.
 * Which colour a group gets is a stylesheet decision, not this component's.
 */

import type { Build } from "../../engine/types";
import type { Attr } from "../../engine/vocabulary";
import { ATTRS, ATTR_GROUPS, ATTR_GROUP_OF, ATTR_LABELS } from "../../engine/vocabulary";
import { AttributeSlider } from "../primitives/AttributeSlider";

export interface AttributeGridProps {
  attributes: Build["attributes"];
  onCommit: (attr: Attr, value: number) => void;
}

export function AttributeGrid({ attributes, onCommit }: AttributeGridProps) {
  return (
    <div className="attribute-grid">
      {ATTR_GROUPS.map((group) => (
        <fieldset key={group} className="attr-group" data-attr-group={group}>
          <legend>{group}</legend>
          <div className="attr-group__fields attr-group__fields--sliders">
            {ATTRS.filter((attr) => ATTR_GROUP_OF[attr] === group).map((attr) => (
              <AttributeSlider
                key={attr}
                label={ATTR_LABELS[attr]}
                value={attributes[attr]}
                onCommit={(value) => {
                  onCommit(attr, value);
                }}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
