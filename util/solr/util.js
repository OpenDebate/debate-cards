module.exports = {
  fuzzy: str => {
    var ret = str
      .split(" ")
      .map(x => (x.length > 5 ? x + "~" : x))
      .join(" ");
    return ret;
  },
  field: fields => {
    let ret = {}
    fields.forEach(field => {
      ret[field] = 1
    });
    return ret;
  },
  filter: filter => {
    const keys = Object.keys(filter);
    let ret = keys.map((key, index) => {
      const values = filter[key].map( e => `"${e}"`)
      return `${key}: (${values})`
    });
    return ret;
  }
};
