import yaml from 'js-yaml';


export function loadYaml(yamlString: string) {
  try {
    return yaml.load(yamlString);
  } catch (e) {
    console.error('Error converting yaml to JSON', e)
    throw new Error('Could not convert yaml to JSON')
  }
}