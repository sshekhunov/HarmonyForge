namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningCourse: BaseEntity
{
    private readonly List<LearningModule> _modules = [];

    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CourseCardImage {  get; set; }
    public string? TopBannerImage {  get; set; } 

    public IEnumerable<LearningModule> Modules => _modules;

    public void AddModules(List<LearningModule> modules)
    {
        if (modules != null && modules.Any())
        {
            _modules.AddRange(modules);
        }
    }

    public void ClearModules()
    {
        _modules.Clear();
    }
}