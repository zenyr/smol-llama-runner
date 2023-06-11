import {
  BooleanField,
  DTObject,
  ArrayField,
  NumberField,
  StringField,
} from "dto-classes";

export class CompletionDto extends DTObject {
  prompt = StringField.bind({ required: true });
  batch_size = NumberField.bind({ required: false, allowNull: true });
  temperature = NumberField.bind({ required: false, allowNull: true });
  top_k = NumberField.bind({ required: false, allowNull: true });
  top_p = NumberField.bind({ required: false, allowNull: true });
  n_predict = NumberField.bind({ required: false, allowNull: true });
  threads = NumberField.bind({ required: false, allowNull: true });
  n_keep = NumberField.bind({ required: false, allowNull: true });
  as_loop = BooleanField.bind({ default: true });
  interactive = BooleanField.bind({ required: false, allowNull: true });
  stop = ArrayField.bind({
    items: StringField.bind(),
    required: false,
    allowNull: true,
  });
  exclude = ArrayField.bind({
    items: StringField.bind(),
    required: false,
    allowNull: true,
  });
}

export class EmbeddingDto extends DTObject {
  content = StringField.bind({ required: true });
  threads = NumberField.bind({ required: false, allowNull: true });
}

export class TokenizeDto extends DTObject {
  content = StringField.bind({ required: true });
}

export class NextTokenDto extends DTObject {
  stop = BooleanField.bind({ required: false, allowNull: true });
}

export class SseDto extends DTObject {
  error = StringField.bind({ required: false, allowNull: true });
  text = ArrayField.bind({
    items: StringField.bind({
      required: false,
      allowNull: true,
      trimWhitespace: false,
    }),
  });
  done = BooleanField.bind({ required: true });
}
