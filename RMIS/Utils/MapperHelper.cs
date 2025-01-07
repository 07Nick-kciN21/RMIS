using AutoMapper;
using RMIS.Models.sql;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace RMIS.Utils
{
    public class MapperHelper
    {
        public static TDestination A2B<TSource, TDestination>(TSource source)
        {
            var config = new MapperConfiguration(cfg =>
            {
                // 如果是列表，解析元素類型
                if (typeof(TSource).IsGenericType && typeof(TDestination).IsGenericType)
                {
                    var sourceElementType = typeof(TSource).GetGenericArguments()[0];
                    var destinationElementType = typeof(TDestination).GetGenericArguments()[0];
                    cfg.CreateMap(sourceElementType, destinationElementType);
                }
                else
                {
                    cfg.CreateMap<TSource, TDestination>();
                }
            });

            var mapper = config.CreateMapper();
            return mapper.Map<TDestination>(source);
        }
    }
}
